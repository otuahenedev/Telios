# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document



class OutletTankReadingLog(Document):
	def validate(self):
		try:
			if self.docstatus == 1:
				if self.prod == "AGO":
					frappe.db.set_value('Outlet', self.outlet, 'current_stock_level_diesel_l', self.fuel_reading)
					frappe.throw("Approved AGO Dip Reading, Click on 'Update Stock'")
				elif self.prod == "PMS":
					frappe.db.set_value('Outlet', self.outlet, 'current_stock_level__petrol_l', self.fuel_reading)
					frappe.throw("Approved PMS Dip Reading, Click on 'Update Stock'")
				else:
					frappe.throw("Select 'AGO' or 'PMS' as the product")			

		except Exception as e:
					# Log the error to the Frappe error log document 
					frappe.log_error(f"An error occurred: {str(e)}")
