# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FuelMeterReading(Document):
	
	#def before_save(self):
	#	for pump in self.table_mtto:
	#		int(pump.total_liters_sold) = pump.closing_reading - pump.opening_reading


	def validate(self):
		#if not self.petrol_rate or self.diesel_rate :
		#	frappe.throw("Please check thr fuel rates")
		# sum for all petrol pumps
		petrol_liters_sold = 0
		rtt_petrol = self.rtt_petrol_liters_used
		rtt_diesel = self.rtt_diesel_liters_used
		for item in self.table_mtto:
			petrol_liters_sold += item.total_liters_sold

		#placing it in the right field and calculating petrol Return to tank
		if rtt_petrol != 0:
			self.total_liters_of_petrol_sold = petrol_liters_sold - rtt_petrol
		else:
			self.total_liters_of_petrol_sold = petrol_liters_sold
		
		

		#total sales for petrol
		total_pet = self.petrol_rate * float(petrol_liters_sold)
		self.total_sales_for_petrol = total_pet
		
		# sum for all diesel pumps
		diesel_liters_sold = 0
		for litter in self.table_yvwr:
			diesel_liters_sold += litter.total_liters_sold

		#placing it in the right field
		if rtt_diesel != 0:
			self.total_liters_of_diesel_sold = diesel_liters_sold - rtt_diesel
		else:
			self.total_liters_of_diesel_sold = diesel_liters_sold	

		##total sales for petrol
		total_die = self.diesel_rate * diesel_liters_sold
		self.total_sales_for_diesel = total_die

		#update petol stock
		name = self.outlet
		current_petrol_stock = frappe.db.get_value('Outlet', name, 'current_stock_level__petrol_l')
		updated_petrol_stock = current_petrol_stock - petrol_liters_sold
		frappe.db.set_value('Outlet', name, 'current_stock_level__petrol_l', updated_petrol_stock)
		frappe.db.set_value('Outlet', name, 'petrol_total_sales', total_pet)

		#update Diesel stock
		tag = self.outlet
		current_diesel_stock = frappe.db.get_value('Outlet', tag, 'current_stock_level_diesel_l')
		updated_diesel_stock = current_diesel_stock - diesel_liters_sold
		frappe.db.set_value('Outlet', tag, 'diesel_total_sales', total_die)

		
	
		#update total amount
		self.total_amount = self.total_sales_for_diesel + self.total_sales_for_petrol

		#discrepancies
		self.discrepancies = self.total_amount - self.amount_paid
