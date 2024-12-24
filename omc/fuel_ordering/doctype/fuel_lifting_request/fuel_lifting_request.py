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






#create delivery notes for each oulet lisred in delivered to table
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
		

@frappe.whitelist()
def fetch_fuel_data(product):
    """
    Fetch OFT data and calculate ADS for the given product.
    """
    # Fetch OFT data
    oft_data = frappe.get_all(
        "Outlet Fuel Tank",
        filters={"product": product},
        fields=["outlet", "current_level_l", "reorder_level_l"]
    )

    # Fetch sales data
    sales_data = frappe.db.sql("""
        SELECT
            SUM(child.total_volume_sold_l) AS total_volume,
            COUNT(DISTINCT parent.posting_date) AS num_days
        FROM `tabOutlet Pump Sales` parent
        JOIN `tabPump Reading Totals` child ON child.parent = parent.name
        WHERE child.product = %s
    """, (product,), as_dict=True)

    total_volume = sales_data[0].get("total_volume", 0) or 0
    num_days = sales_data[0].get("num_days", 1)  # Avoid division by zero
    ads = total_volume / num_days

    return {"oft_data": oft_data, "ads": ads}


