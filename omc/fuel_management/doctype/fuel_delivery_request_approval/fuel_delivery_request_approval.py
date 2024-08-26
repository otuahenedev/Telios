# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

@frappe.whitelist()
def justification(fuel_type):
	art = frappe.db.sql(f""" SELECT o.name AS "FuelStation",AVG(fmr.total_liters_of_diesel_sold) AS "AverageDailyDieselSales",o.current_stock_level_diesel_l  AS "CurrentDieselStock",o.current_stock_level_diesel_l / AVG(fmr.total_liters_of_diesel_sold) AS "DieselStockLifespan", o.diesel_reorder_level_l AS "ReorderLevelDiesel", AVG(fmr.total_liters_of_petrol_sold) AS "AverageDailyPetrolSales", o.current_stock_level__petrol_l AS "CurrentPetrolStock", o.current_stock_level__petrol_l / AVG(fmr.total_liters_of_petrol_sold) AS "PetrolStockLifespan",o.petrol_reorder_level_l AS "ReorderLevelPetrol" FROM tabOutlet o INNER JOIN  `tabFuel Meter Reading` fmr ON o.name = fmr.outlet WHERE fmr.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY o.name, o.current_stock_level_diesel_l,o.diesel_reorder_level_l ORDER BY o.name;""" , as_dict=True)
	return art

@frappe.whitelist()
def truckdetails(truckid):
	items = frappe.get_all("Tanker Compartments", fields=["volume_l"], filters={ "parent": truckid, "parenttype": "Fuel Truck"}, order_by="idx")
	data = [list(d.values())[0] for d in items]	
	return data





class FuelDeliveryRequestApproval(Document):
	def validate(self):
		# Validate if set volumes listed on the request fuel details amount to the total storage capacity of the truck 
		try:
			total_set_volume = 0
			for tank in self.table_mxlk:
				tank_vol = int(tank.volume_l)
				total_set_volume += tank_vol
			if total_set_volume != self.nominal_volume_l:
				frappe.throw(
				title="Error - Volume set exceed Fuel Truck Starage Capacity ",
				msg=  f"Current Total {type(tank_vol)} for all outlets - {type(total_set_volume)} {total_set_volume} litres must not exceed BRV's storage of  {self.nominal_volume_l} litres ",)


		except Exception as e:
		# Log the error to the Frappe error log document
			frappe.log_error(f"An error occurred: {str(e)}")
		


