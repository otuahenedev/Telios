# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FuelLiftingLog(Document):
	pass




def create_fuel_lifting_log(doc, method):
    """
    Automatically create a Fuel Lifting Log when a Fuel Lifting Request is submitted.
    """
    try:
        # Create a new Fuel Lifting Log document
        fuel_lifting_log = frappe.get_doc({
            "doctype": "Fuel Lifting Log",
            "fuel_lifting_request_ref": doc.name,  # Link to the submitted Fuel Lifting Request
            "order_date": doc.order_date,
            "mode_of_transport": doc.mode_of_transport,
            "bdc": doc.bdc,
            "fuel_type": doc.fuel_type,
            "driver": doc.driver,
            "drivers_contact": doc.drivers_contact,
            "depot": doc.depot,
            "product_group": doc.product_group,
            "mate": doc.mate,
            "mates_contact": doc.mates_contact,
            "brv": doc.brv,
            "buy_price": doc.buy_price,
            "nominal_volume_l": doc.nominal_volume_l,
            "distance": doc.distance,
            "fuel_price_rate": doc.fuel_price_rate,
            "lkm": doc.lkm,
            "transporter": doc.transporter,
            "transporter_quotation": doc.transporter_quotation,
            "transportation_cost_section": doc.transportation_cost_section
        })

        # Map child table data (table_mxlk) from Fuel Lifting Request to Fuel Lifting Log
        for row in doc.table_mxlk:
            fuel_lifting_log.append("table_mxlk", {
                "field1": row.field1,  # Replace with actual fieldnames
                "field2": row.field2,  # Replace with actual fieldnames
                # Map other fields as required
            })

        # Insert the new document into the database
        fuel_lifting_log.insert()
        frappe.msgprint(f"Fuel Lifting Log {fuel_lifting_log.name} created successfully.")

    except Exception as e:
        frappe.log_error(f"Error creating Fuel Lifting Log: {e}", "Fuel Lifting Log Creation")
        frappe.throw(f"Failed to create Fuel Lifting Log. Please check the logs for more details.")
