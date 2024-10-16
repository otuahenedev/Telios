# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

@frappe.whitelist()
def attendetails(dispense):
    # Fetch dispenser details related to the dispense (Customer)
    items = frappe.get_all(
        "Fuel Dispenser", 
        fields=["dispenser"], 
        filters={ 
            "parent": dispense, 
            "parenttype": "Customer", 
            "status": "Active"
        }, 
        order_by="idx"
    )
    
    # Extract values from list of dicts
    data = [list(d.values())[0] for d in items]	
    return {"message": data}  # Return as a dict with "message" key, standard Frappe convention


@frappe.whitelist()  # Make sure to add this decorator so Frappe can call it
def pumpdetails(atted):
    # Fetch full names of attendants for the given customer
    items = frappe.get_all(
        "Attendants Details", 
        fields=["full_name"],  
        filters={ 
            "parent": atted, 
            "parenttype": "Customer"
        }, 
        order_by="idx"
    )
    
    # Extract values from list of dicts
    attend_data = [list(d.values())[0] for d in items]
    return {"message": attend_data}  # Return as a dict with "message" key



# In your custom app, in a custom Python file (or the relevant DocType's Python file)
@frappe.whitelist()
def dispenser(outlet):
    # Fetch the latest Fuel Dispenser Reading for the given outlet
    last_reading = frappe.get_list('Fuel Dispenser Reading', 
                                   filters={'outlet': outlet}, 
                                   fields=['name'], 
                                   order_by='creation desc', 
                                   limit=1)

    if not last_reading:
        return {'status': 'error', 'message': 'No previous readings found for this outlet.'}

    # Fetch the full details of the last reading document
    last_doc = frappe.get_doc('Fuel Dispenser Reading', last_reading[0].name)

    # Prepare the data for the child tables
    pms_pump_readings = []
    ago_pump_readings = []

    for row in last_doc.pms_pump_readings_petrol:
        pms_pump_readings.append({
            'pump': row.pump,
            'current_reading': row.current_reading
        })

    for row in last_doc.ago__pump_readings_diesel:
        ago_pump_readings.append({
            'pump': row.pump,
            'current_reading': row.current_reading
        })

    # Return the data for both child tables
    return {
        'status': 'success',
        'pms_pump_readings': pms_pump_readings,
        'ago_pump_readings': ago_pump_readings
    }


class FuelDispenserReading(Document):
	pass
