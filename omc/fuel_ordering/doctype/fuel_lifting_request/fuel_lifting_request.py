# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime

@frappe.whitelist()
def justification(fuel_type):
	art = frappe.db.sql(f""" SELECT o.name AS "FuelStation",AVG(fmr.total_liters_of_diesel_sold) AS "AverageDailyDieselSales",o.current_stock_level_diesel_l  AS "CurrentDieselStock",o.current_stock_level_diesel_l / AVG(fmr.total_liters_of_diesel_sold) AS "DieselStockLifespan", o.diesel_reorder_level_l AS "ReorderLevelDiesel", AVG(fmr.total_liters_of_petrol_sold) AS "AverageDailyPetrolSales", o.current_stock_level__petrol_l AS "CurrentPetrolStock", o.current_stock_level__petrol_l / AVG(fmr.total_liters_of_petrol_sold) AS "PetrolStockLifespan",o.petrol_reorder_level_l AS "ReorderLevelPetrol" FROM tabOutlet o INNER JOIN  `tabFuel Pump Reading` fmr ON o.name = fmr.outlet WHERE fmr.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY o.name, o.current_stock_level_diesel_l,o.diesel_reorder_level_l ORDER BY o.name;""" , as_dict=True)
	return art

@frappe.whitelist()
def truckdetails(truckid):
	items = frappe.get_all("Tanker Compartment", fields=["volume_l"], filters={ "parent": truckid, "parenttype": "Fuel Truck"}, order_by="idx")
	data = [list(d.values())[0] for d in items]	
	return data




@frappe.whitelist()
def create_supplier_payment_entry(fuel_purchase_order):
    # Fetch the Fuel Purchase Order document
    po_doc = frappe.get_doc("Fuel Purchase Order", fuel_purchase_order)
    
    # Check if the order is vetted
    if po_doc.state != 'Vetted':
        frappe.throw("Payment can only be made after the order is vetted by the auditor.")

    # Create Payment Entry for Supplier Cost
    payment_entry = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Pay",
        "posting_date": po_doc.transaction_date,
        "paid_from": "Bank Account",  # Replace with the actual bank/cash account
        "paid_to": "Supplier",        # Replace with actual payable account or party account
        "party_type": "Supplier",
        "party": po_doc.supplier,
        "paid_amount": po_doc.supply_cost,  # Assuming supply_cost is defined in the document
        "references": [
            {
                "reference_doctype": "Fuel Purchase Order",
                "reference_name": po_doc.name,
                "total_amount": po_doc.supply_cost,
                "outstanding_amount": po_doc.supply_cost
            }
        ]
    })
    payment_entry.insert()
    payment_entry.submit()

@frappe.whitelist()
def create_immediate_tax_payment_entry(fuel_purchase_order):
    po_doc = frappe.get_doc("Fuel Purchase Order", fuel_purchase_order)

    # Check if the order is vetted
    if po_doc.state != 'Vetted':
        frappe.throw("Payment can only be made after the order is vetted by the auditor.")

    # Create Payment Entry for Immediate Taxes
    total_immediate_taxes = po_doc.total_immediate_taxes
    payment_entry = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Pay",
        "posting_date": po_doc.transaction_date,
        "paid_from": "Bank Account",  # Replace with actual bank account
        "paid_to": "Tax Liability Account",  # Replace with actual tax liability account
        "references": []
    })

    for tax in po_doc.immediate_taxes:
        payment_entry.append("references", {
            "reference_doctype": "Fuel Purchase Order",
            "reference_name": po_doc.name,
            "total_amount": tax.amount,
            "outstanding_amount": tax.amount
        })

    payment_entry.paid_amount = total_immediate_taxes
    payment_entry.insert()
    payment_entry.submit()

@frappe.whitelist()
def create_deferred_tax_payment_entry(fuel_purchase_order):
    po_doc = frappe.get_doc("Fuel Purchase Order", fuel_purchase_order)

    # Check if the order is vetted
    if po_doc.state != 'Vetted':
        frappe.throw("Payment can only be made after the order is vetted by the auditor.")

    # Create Payment Entry for Deferred Taxes
    total_deferred_taxes = po_doc.total_deferred_taxes
    payment_entry = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Pay",
        "posting_date": datetime.today(),
        "paid_from": "Bank Account",  # Replace with actual bank account
        "paid_to": "Deferred Tax Liability Account",  # Replace with actual deferred tax account
        "references": []
    })

    for tax in po_doc.deferred_taxes:
        payment_entry.append("references", {
            "reference_doctype": "Fuel Purchase Order",
            "reference_name": po_doc.name,
            "total_amount": tax.amount,
            "outstanding_amount": tax.amount
        })

    payment_entry.paid_amount = total_deferred_taxes
    payment_entry.insert()
    payment_entry.submit()


class FuelLiftingRequest(Document):
    def validate(self):
        """
        Validate if set volumes listed on the request fuel details table
        amount to the total storage capacity of the truck.
        """
        try:
            total_set_volume = 0  # Initialize total set volume
            
            # Sum up the volumes for all tanks in the child table
            for tank in self.table_mxlk:
                tank_vol = int(tank.volume_l)  # Ensure volume is treated as an integer
                total_set_volume += tank_vol

            # Check if the total set volume exceeds the nominal truck capacity
            if total_set_volume != self.nominal_volume_l:
                frappe.throw(
                    title="Error - Volume Set Exceeds Fuel Truck Storage Capacity",
                    msg=(
                        f"Current total for all outlets: {total_set_volume} litres "
                        f"does not match the BRV's storage capacity of {self.nominal_volume_l} litres."
                    ),
                )

        except Exception as e:
            # Log the error to the Frappe error log
            frappe.log_error(f"An error occurred during validation: {str(e)}")
            frappe.throw("An unexpected error occurred. Please check the error logs for details.")

    def on_submit(self):
        """
        Triggered on submission of FLO.
        Calls a method to generate Outlet Delivery Notes.
        """
        generate_outlet_delivery_notes(self.name)
                  

@frappe.whitelist()
def generate_outlet_delivery_notes(docname):
    """
    Generate Outlet Delivery Notes for each outlet in `table_mxlk` and notify Station Supervisors.
    This method can be triggered manually using a button or automatically on submit.
    """
    doc = frappe.get_doc("Fuel Lifting Request", docname)

    # Validation: Ensure child table `table_mxlk` is not empty
    if not doc.table_mxlk:
        frappe.throw("Please ensure the 'Deliver To' table is populated before submission.")

    # Prepare for bulk insertion and error logging
    outlet_delivery_notes = []
    error_log = []

    for row in doc.table_mxlk:
        try:
            # Fetch Station Supervisor either from `row` or from Outlet record
            station_supervisor = row.station_supervisor or frappe.db.get_value("Outlet", row.fuel_station, "custom_station_supervisor")
            if not station_supervisor:
                raise ValueError(f"Station Supervisor not assigned for Outlet {row.fuel_station} in either the Outlet or Request Fuel Details table.")

            # Validate critical fields
            if not doc.buy_price:
                raise ValueError("Product price rate  is missing in the Fuel Lifting Request document.")
            if not row.volume_l:
                raise ValueError(f"Volume (L) is missing for outlet {row.fuel_station} in the Request Fuel Details table.")

            # Calculate Product Value
            product_value = float(row.product_price) * float(row.volume_l) if row.product_price and row.volume_l else 0

            # Prepare Outlet Delivery Note for bulk insertion
            outlet_delivery_note = {
                "doctype": "Outlet Delivery Note",
                "outlet": row.fuel_station,
                "fuel_lifting_log_ref": doc.name,
                "fuel_type": doc.fuel_type,
                "station_supervisor": station_supervisor,
                "product_price_rate": row.product_price,
                "fuel_quantity_expected": row.volume_l,
                "driver_name": doc.driver,
                "product_value": product_value
            }
            outlet_delivery_notes.append(outlet_delivery_note)

            # Notify Station Supervisor (Example: Email or Notification)
            supervisor_email = frappe.db.get_value("Employee", station_supervisor, "user_id")
            if supervisor_email:
                frappe.sendmail(
                    recipients=supervisor_email,
                    subject=f"Fuel Delivery Scheduled for {row.fuel_station}",
                    message=f"The fuel lifting request {doc.name} has been processed. "
                            f"Please ensure receipt of {row.volume_l} liters of {doc.fuel_type}."
                )

        except Exception as e:
            # Log errors for review
            error_log.append(f"Error for Outlet {row.fuel_station}: {str(e)}")

    # Bulk insert all Outlet Delivery Notes
    if outlet_delivery_notes:
        frappe.get_doc(outlet_delivery_notes)

    # Display error log if any
    if error_log:
        frappe.msgprint("\n".join(error_log), title="Errors in Delivery Note Creation")

    return "Outlet Delivery Notes created successfully."    """
    Generate Outlet Delivery Notes for each outlet in `table_mxlk` and notify Station Supervisors.
    This method can be triggered manually using a button or automatically on submit.
    """
    doc = frappe.get_doc("Fuel Lifting Request", docname)

    # Validation: Ensure child table `table_mxlk` is not empty
    if not doc.table_mxlk:
        frappe.throw("Please ensure the 'Request Fuel Details' table is populated before submission.")

    for row in doc.table_mxlk:
        # Fetch Station Supervisor for the outlet
        station_supervisor = frappe.db.get_value("Outlet", row.fuel_station, "custom_station_supervisor")
        if not station_supervisor:
            frappe.throw(f"Station Supervisor not assigned for Outlet {row.fuel_station}")

        # Validate critical fields
        if not doc.buy_price:
            frappe.throw("Product price rate (buy_price) is missing in the Fuel Lifting Request document.")
        if not row.volume_l:
            frappe.throw(f"Volume (L) is missing for outlet {row.fuel_station} in the Request Fuel Details table.")

        # Calculate Product Value
        

        # Create Outlet Delivery Note
        outlet_delivery_note = frappe.get_doc({
            "doctype": "Outlet Delivery Note",
            "outlet": row.fuel_station,
            "fuel_lifting_log_ref": doc.name,
            "fuel_type": doc.fuel_type,
            "station_supervisor": station_supervisor,
            "product_price_rate": row.product_price,
            "fuel_quantity_expected": row.volume_l,
            "driver_name": doc.driver,
            "product_value": product_value
        })
        outlet_delivery_note.insert()

   

    return "Outlet Delivery Notes created successfully."
		




