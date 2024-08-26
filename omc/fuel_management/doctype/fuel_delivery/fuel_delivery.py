# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FuelDelivery(Document):
	def validate(self):
		try:
			if (self.buy_price != 0):
				self.paid_amount = self.buy_price * self.nominal_volume_l
			else:
				self.paid_amount = self.diesel_buy_price * self.nominal_volume_l
			
		except Exception as e:
			# Log the error to the Frappe error log document
			frappe.log_error(f"An error occurred: {str(e)}")
		try:
			if (self.buy_price != 0):
				self.paid_amount = self.buy_price * self.nominal_volume_l
			else:
				self.paid_amount = self.diesel_buy_price * self.nominal_volume_l
			
		except Exception as e:
			# Log the error to the Frappe error log document
			frappe.log_error(f"An error occurred: {str(e)}")

		# refill fuel tanks
		try:		
			if self.workflow_state == "Complete":
					
					if self.fuel_type == "Petrol":
						for station in self.fdp_tab:
							cur_fuel_lvl =  frappe.db.get_value('Outlet', station.fuel_station, 'current_stock_level__petrol_l')
							pet_current_stock = int(station.volume_l) + int(cur_fuel_lvl)
							frappe.db.set_value('Outlet', station.fuel_station, 'current_stock_level__petrol_l' ,pet_current_stock)
					elif self.fuel_type == "Diesel":
						for station in self.fdp_tab:
							cur_fuel_lvl =  frappe.db.get_value('Outlet', station.fuel_station, 'current_stock_level_diesel_l')
							diesel_current_stock = int(station.volume_l) + int(cur_fuel_lvl)
							frappe.db.set_value('Outlet', station.fuel_station, "current_stock_level_diesel_l", diesel_current_stock)
					else:
						frappe.throw("Unable to upadte outlet fuel readings", raise_exception=True)
		except Exception as e:
			# Log the error to the Frappe error log document
			frappe.log_error(f"An error occurred: {str(e)}")

		#fuel verification 
		try:
			if self.workflow_state == "Delivery":
				for outlet in self.fdp_tab:
					verify  = frappe.get_doc({"doctype":"Fuel Delivery Verification", "outlet": "test","fuel_type":self.fuel_type,"volume_received_l":outlet.volume_l})
					verify.insert(ignore_permissions = True)
		except Exception as e:
			# Log the error to the Frappe error log document
			frappe.log_error(f"An error occurred: {str(e)}")



