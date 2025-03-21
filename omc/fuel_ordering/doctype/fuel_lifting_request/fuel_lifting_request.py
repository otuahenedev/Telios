# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime
from frappe.utils import today
from frappe.utils import add_days
from frappe.utils import flt


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
        generate_outlet_delivery_notes(self)
        create_statutory_payments(self)
        create_journal_entry(self)






#create delivery notes for each oulet lisred in delivered to table

@frappe.whitelist()
def generate_outlet_delivery_notes(self):
    """
    Triggered when Fuel Lifting Request is submitted.
    Generates Outlet Fuel Delivery Notes for each outlet in the 'Deliver To' table.
    """
    
    # Validation: Ensure child table 'table_mxlk' is not empty
    if not self.table_mxlk:
        frappe.throw("Please ensure the 'Deliver To' table is populated before submission.")

    # Calculate total outlets to share costs
    total_outlets = len(self.table_mxlk)
    if total_outlets == 0:
        frappe.throw("No outlets listed in the 'Deliver To' table.")

    # Fetch shared cost components
    total_transport_cost = flt(self.transportation_cost or 0)  # Ensure value is float
    total_tax_cost = flt(self.total_taxes_and_charges or 0)  # Ensure value is float
    shared_cost_per_outlet = (total_transport_cost + total_tax_cost) / total_outlets

    # Prepare for error logging
    error_log = []

    for row in self.table_mxlk:
        try:
            # Fetch Station Supervisor from the row or Outlet master
            station_supervisor = row.station_supervisor or frappe.db.get_value(
                "Outlet", row.fuel_station, "station_supervisor"
            )
            if not station_supervisor:
                raise ValueError(f"Station Supervisor not assigned for Outlet {row.fuel_station}.")

            # Validate required fields
            if not self.buy_price:
                raise ValueError("Product buy price (buy_price) is missing in the Fuel Lifting Request document.")
            if not row.volume_l:
                raise ValueError(f"Fuel volume (L) is missing for Outlet {row.fuel_station}.")

            # Fetch product price from the Outlet -> Product Pricing table
            product_price = frappe.db.get_value(
                "Outlet Product Price", {"parent": row.fuel_station, "product": self.fuel_type}, "rate"
            )
            if not product_price:
                product_price = flt(self.buy_price)  # Default to `buy_price` if no outlet-specific rate exists

            # Calculate Product Value
            product_value = (flt(product_price) * flt(row.volume_l)) + shared_cost_per_outlet

            # Create Outlet Fuel Delivery Note
            outlet_delivery_note = frappe.get_doc({
                "doctype": "Outlet Fuel Delivery Note",
                "outlet": row.fuel_station,
                "fuel_lifting_log_ref": self.name,
                "fuel_type": self.fuel_type,
                "station_supervisor": station_supervisor,
                "product_price_rate": product_price,
                "fuel_quantity_expected": flt(row.volume_l),
                "driver_name": self.driver,
                "product_value": product_value
            })
            outlet_delivery_note.insert()
            frappe.msgprint(f"Delivery Note created for {row.fuel_station}")

        except Exception as e:
            # Log errors for review
            error_log.append(f"Error for Outlet {row.fuel_station}: {str(e)}")
            frappe.log_error(f"Fuel Delivery Note Error for {row.fuel_station}: {str(e)}", "Fuel Lifting Request")

    # Display error log if any issues occurred
    if error_log:
        frappe.msgprint("\n".join(error_log), title="Errors in Fuel Delivery Note Creation")
    else:
        frappe.msgprint("✅ Outlet Fuel Delivery Notes have been created successfully.")


@frappe.whitelist()
def fetch_fuel_data(product):
    """
    Fetch OFT data and calculate ADS for the given product per outlet.
    """
    # Fetch OFT data for the specified product
    oft_data = frappe.get_all(
        "Outlet Fuel Tank",
        filters={"product": product},
        fields=["outlet", "current_level_l", "reorder_level_l"]
    )
  #  print("OFT Data:", oft_data)  # Debug log for fetched OFT data

    # Prepare trends data
    trends_data = []

    for oft in oft_data:
        # Calculate ADS for each outlet
        sales_data = frappe.db.sql("""
            SELECT
                SUM(child.total_volume_sold_l) AS total_volume,
                COUNT(DISTINCT parent.creation) AS num_days
            FROM `tabOutlet Pump Sales` parent
            JOIN `tabPump Reading Totals` child ON child.parent = parent.name
            WHERE child.product = %s AND parent.outlet = %s
        """, (product, oft["outlet"]), as_dict=True)

        total_volume = sales_data[0].get("total_volume", 0) or 0
        num_days = sales_data[0].get("num_days", 1)  # Avoid division by zero
        ads = total_volume / num_days if num_days > 0 else 0

        # Calculate stock lifespan
        stock_lifespan = ads > 0 and (oft["current_level_l"] / ads) or 0

        # Append to trends data
        trends_data.append({
            "outlet": oft["outlet"],
            "average_daily_sales_l": ads,
            "current_stock_l": oft["current_level_l"],
            "stock_lifespan_days": stock_lifespan,
            "reorder_level_l": oft["reorder_level_l"]
        })

  #  print("Trends Data:", trends_data)  # Debug log for trends data
    return trends_data
#

# def log_reminder_activity(count):
#     """
#     Log the number of reminders sent for auditing.
#     """
#     if count > 0:
#         frappe.get_doc({
#             "doctype": "System Log",
#             "type": "Info",
#             "subject": "Statutory Payment Reminder Notifications Sent",
#             "content": f"{count} unpaid statutory payment reminders were sent to Accounts users."
#         }).insert()



# def create_tax_payments(parent_docname):
#     """
#     Creates a new Tax Payment document for each tax listed in the child table of a parent document.

#     :param parent_docname: The name of the parent document containing the child table of taxes.
#     """
#     try:
#         # Fetch the parent document
#         parent_doc = frappe.get_doc("YourParentDoctype", parent_docname)

#         # Ensure the child table exists
#         if not hasattr(parent_doc, "child_table_fieldname"):
#             frappe.throw("Child table 'child_table_fieldname' not found in the parent document.")

#         # Iterate through the child table and create Tax Payments
#         for child_row in parent_doc.child_table_fieldname:
#             # Validate that required fields are populated
#             if not child_row.tax_name or not child_row.amount:
#                 frappe.throw(f"Row {child_row.idx}: 'Tax Name' and 'Amount' are required fields.")

#             # Create a new Tax Payment document
#             tax_payment = frappe.new_doc("Tax Payment")
#             tax_payment.tax_name = child_row.tax_name
#             tax_payment.amount = child_row.amount
#             tax_payment.due_date = child_row.due_date or parent_doc.due_date  # Optional: inherit due date
#             tax_payment.parent_reference = parent_docname  # Optional: link back to the parent document

#             # Save and submit the Tax Payment document
#             tax_payment.insert()
#             tax_payment.submit()

#         frappe.msgprint(f"Tax Payments successfully created for all rows in {parent_docname}.")

#     except Exception as e:
#         frappe.throw(f"An error occurred: {str(e)}")





@frappe.whitelist()
def create_statutory_payments(doc):
    """
    Creates Statutory Payment documents for each applicable tax row in the Fuel Lifting Request.

    :param doc: Fuel Lifting Request document
    """

    # Ensure the document is submitted before proceeding
    if doc.docstatus != 1:
        frappe.throw("Statutory Payments can only be generated after submission.")

    

    # Track created payments
    created_payments = []
    error_log = []

    for tax_row in doc.tax:
        try:
            # Skip if tax row is missing required fields
            if not tax_row.payment_due or not tax_row.tax_amount:
                error_log.append(f"Skipping {tax_row.tax_name}: Missing tax amount or due date.")
                continue

            if tax_row.tax_type != "Deferred":
                continue  # Only process deferred taxes

            

            # Check if a Statutory Payment already exists for this tax
            existing_payment = frappe.db.exists(
                "Statutory Payment",
                {"tax_name": tax_row.tax_name, "payment_due_date": payment_due_date}
            )
            if existing_payment:
                error_log.append(f"Skipping {tax_row.tax_name}: Already recorded.")
                continue

            # Create new Statutory Payment
            statutory_payment = frappe.get_doc({
                "doctype": "Statutory Payment",
                "fuel_lifting_request": doc.name,
                "tax_name": tax_row.tax_name,
                "tax_amount": tax_row.tax_amount,
                "payment_due_date": tax_row.payment_due_date,
                "status": "Unpaid"  # Default status for new payments
            })

            # Insert into database
            statutory_payment.insert(ignore_permissions=True)
            created_payments.append(tax_row.tax_name)

        except Exception as e:
            error_log.append(f"Error for {tax_row.tax_name}: {str(e)}")
            frappe.log_error(f"Error creating Statutory Payment for {tax_row.tax_name}: {str(e)}")

    # Notify user
    if created_payments:
        frappe.msgprint(f"✅ Statutory Payments created for: {', '.join(created_payments)}")

    if error_log:
        frappe.msgprint(f"⚠️ Issues encountered:\n" + "\n".join(error_log))



@frappe.whitelist()
def get_fuel_taxes(fuel_type):
    """
    Fetch all active Statutory Fuel Tax records along with the relevant fuel product tax rates for the given fuel_type.
    """
    try:
        # Ensure case-insensitive matching
        fuel_type = str(fuel_type).strip().lower()

        # Fetch parent tax records
        tax_records = frappe.get_all(
            "Statutory Fuel Tax",
            filters={"tax_purpose": "Fuel Purchase", "status": "Active"},
            fields=["name", "tax_name", "tax_type", "account", "cost_center", "tax_payment_reminder_period_days"]
        )

        filtered_records = []  # Store only relevant tax records

        for record in tax_records:
            # Fetch child table entries and filter manually
            fuel_rates = frappe.get_all(
                "Fuel Product Tax Rates",
                filters={"parent": record["name"]},
                fields=["product", "rate"]
            )

            # Manual filtering to ensure exact matching
            matching_rates = [rate for rate in fuel_rates if str(rate["product"]).strip().lower() == fuel_type]

            if matching_rates:
                record["fuel_product_tax_rates"] = matching_rates
                filtered_records.append(record)

        return filtered_records

    except Exception as e:
        frappe.log_error(f"Error fetching fuel taxes: {str(e)}", "get_fuel_taxes")
        return {"error": str(e)}



def create_journal_entry(doc):
    default_company = frappe.db.get_single_value("Global Defaults", "default_company")
    
    """
    Create and save a Journal Entry for the submitted document.
    Handles supplier payment, transportation cost, and customs tax.
    """
    try:
        je = frappe.get_doc({
            "doctype": "Journal Entry",
            "posting_date": frappe.utils.today(),
            "voucher_type": "Journal Entry",
            "company": default_company,
            "remark": f"Journal Entry for {doc.name}",
            "accounts": []
        })

        # Supplier Payable Entry
        if doc.supplier and doc.total_cost:
            je.append("accounts", {
                "account": doc.supplier_account,  # Replace with the correct GL account for suppliers
                "party_type": "Supplier",
                "party": doc.supplier,
                "credit_in_account_currency": doc.total_cost,
                "debit_in_account_currency": 0,
                "cost_center": doc.cost_center
            })

        # Transportation Cost Entry
        if doc.transporter and doc.transportation_cost:
            je.append("accounts", {
                "account": doc.transportation_account,  # Replace with the transportation expense account
                "party_type": "Supplier",
                "party": doc.transporter,
                "credit_in_account_currency": doc.transportation_cost,
                "debit_in_account_currency": 0,
                "cost_center": doc.cost_center
            })

        # Customs Tax Entry
        if doc.gra_customs_tax:
            je.append("accounts", {
                "account": doc.customs_tax_account,  # Replace with the customs tax liability account
                "credit_in_account_currency": doc.gra_customs_tax,
                "debit_in_account_currency": 0,
                "cost_center": doc.cost_center
            })

        # Balancing Debit Entry
        total_credit = (doc.total_cost or 0) + (doc.transportation_cost or 0) + (doc.gra_customs_tax or 0)
        je.append("accounts", {
            "account": doc.payment_account,  # Replace with the bank/cash payment account
            "debit_in_account_currency": total_credit,
            "credit_in_account_currency": 0,
            "cost_center": doc.cost_center
        })

        je.insert(ignore_permissions=True)
       # je.submit()

        frappe.msgprint(f"Journal Entry {je.name} created successfully.")

    except Exception as e:
        frappe.log_error(f"Error creating journal entry for {doc.name}: {str(e)}")
        frappe.throw(f"Error while creating Journal Entry: {str(e)}")
