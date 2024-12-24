# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document





# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

@frappe.whitelist() #call for dispenser/pump details 
def attendetails(dispense):
    # Fetch dispenser/pump details related to the dispense (outlet)
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


@frappe.whitelist()   #call for names of attendants
def pumpdetails(atted):
    # Fetch full names of attendants for the given outlet
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
   pass

class OutletPumpSales(Document):
     
     def validate(self):
         try :
             if self.workflow_state == "Verified Pump Readings":
                 sales = frappe.get.doc({
                     "doctype": "Deposit Sales",
                     "pump_reading_ref": self.name,
                      "deposit_amount": self.total_sales,
                 }) 
                 sales.insert()
                 frappe.msgprint(f"Sales Deposit created successfully for {self.name} with amount {self.total_sales}")
         except Exception as e:
             frappe.log_error(f"An error occurred: {str(e)}")
		
			
         
         for reading in self.get("dispenser_readings"):
             if reading.current_reading < reading.last_reading:
                 frappe.throw(
                    ("Current reading cannot be less than the last reading for pump: {0}.").format(reading.pump)
            )
        
        
        

     
     
	
