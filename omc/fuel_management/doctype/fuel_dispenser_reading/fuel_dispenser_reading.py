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

class FuelDispenserReading(Document):
	pass
