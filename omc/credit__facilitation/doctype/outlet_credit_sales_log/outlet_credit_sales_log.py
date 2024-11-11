# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class OutletCreditSalesLog(Document):
	pass

@frappe.whitelist()   #call for names of attendants
def staffdetails(staff):
    # Fetch full names of attendants for the given outlet
    items = frappe.get_all(
        "Company Staff", 
        fields=["fullname"],  
        filters={ 
            "parent": staff, 
            "parenttype": "Credit Application"
        }, 
        order_by="idx"
    )
    
    # Extract values from list of dicts
    staff_data = [list(d.values())[0] for d in items]
    return {"message": staff_data}  # Return as a dict with "message" key
