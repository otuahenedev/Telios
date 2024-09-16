# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DipReading(Document):
	def validate(self):
		try:
			if self.workflow_state == "Approved":
				if self.prod == "AGO":
					frappe.db.set_value('Outlet', self.outlet, 'current_stock_level_diesel_l', self.fuel_reading)
				elif self.prod == "PMS":
					frappe.db.set_value('Outlet', self.outlet, 'current_stock_level__petrol_l', self.fuel_reading)
				else:
					frappe.throw("Select 'AGO' or 'PMS' as the product")			

		except Exception as e:
					# Log the error to the Frappe error log document 
					frappe.log_error(f"An error occurred: {str(e)}")
