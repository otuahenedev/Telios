# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime

@frappe.whitelist()
def justification(fuel_type):
	art = frappe.db.sql(f""" SELECT o.name AS "FuelStation",AVG(fmr.total_liters_of_diesel_sold) AS "AverageDailyDieselSales",o.current_stock_level_diesel_l  AS "CurrentDieselStock",o.current_stock_level_diesel_l / AVG(fmr.total_liters_of_diesel_sold) AS "DieselStockLifespan", o.diesel_reorder_level_l AS "ReorderLevelDiesel", AVG(fmr.total_liters_of_petrol_sold) AS "AverageDailyPetrolSales", o.current_stock_level__petrol_l AS "CurrentPetrolStock", o.current_stock_level__petrol_l / AVG(fmr.total_liters_of_petrol_sold) AS "PetrolStockLifespan",o.petrol_reorder_level_l AS "ReorderLevelPetrol" FROM tabOutlet o INNER JOIN  `tabFuel Pump Reading` fmr ON o.name = fmr.outlet WHERE fmr.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY o.name, o.current_stock_level_diesel_l,o.diesel_reorder_level_l ORDER BY o.name;""" , as_dict=True)
	return art

@frappe.whitelist()
def truckdetails(truckid):
	items = frappe.get_all("Tanker Compartment", fields=["volume_l"], filters={ "parent": truckid, "parenttype": "Fuel Truck"}, order_by="idx")
	data = [list(d.values())[0] for d in items]	
	return data




@frappe.whitelist()
def create_supplier_payment_entry(fuel_purchase_order):
    # Fetch the Fuel Purchase Order document
    po_doc = frappe.get_doc("Fuel Purchase Order", fuel_purchase_order)
    
    # Check if the order is vetted
    if po_doc.state != 'Vetted':
        frappe.throw("Payment can only be made after the order is vetted by the auditor.")

    # Create Payment Entry for Supplier Cost
    payment_entry = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Pay",
        "posting_date": po_doc.transaction_date,
        "paid_from": "Bank Account",  # Replace with the actual bank/cash account
        "paid_to": "Supplier",        # Replace with actual payable account or party account
        "party_type": "Supplier",
        "party": po_doc.supplier,
        "paid_amount": po_doc.supply_cost,  # Assuming supply_cost is defined in the document
        "references": [
            {
                "reference_doctype": "Fuel Purchase Order",
                "reference_name": po_doc.name,
                "total_amount": po_doc.supply_cost,
                "outstanding_amount": po_doc.supply_cost
            }
        ]
    })
    payment_entry.insert()
    payment_entry.submit()

@frappe.whitelist()
def create_immediate_tax_payment_entry(fuel_purchase_order):
    po_doc = frappe.get_doc("Fuel Purchase Order", fuel_purchase_order)

    # Check if the order is vetted
    if po_doc.state != 'Vetted':
        frappe.throw("Payment can only be made after the order is vetted by the auditor.")

    # Create Payment Entry for Immediate Taxes
    total_immediate_taxes = po_doc.total_immediate_taxes
    payment_entry = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Pay",
        "posting_date": po_doc.transaction_date,
        "paid_from": "Bank Account",  # Replace with actual bank account
        "paid_to": "Tax Liability Account",  # Replace with actual tax liability account
        "references": []
    })

    for tax in po_doc.immediate_taxes:
        payment_entry.append("references", {
            "reference_doctype": "Fuel Purchase Order",
            "reference_name": po_doc.name,
            "total_amount": tax.amount,
            "outstanding_amount": tax.amount
        })

    payment_entry.paid_amount = total_immediate_taxes
    payment_entry.insert()
    payment_entry.submit()

@frappe.whitelist()
def create_deferred_tax_payment_entry(fuel_purchase_order):
    po_doc = frappe.get_doc("Fuel Purchase Order", fuel_purchase_order)

    # Check if the order is vetted
    if po_doc.state != 'Vetted':
        frappe.throw("Payment can only be made after the order is vetted by the auditor.")

    # Create Payment Entry for Deferred Taxes
    total_deferred_taxes = po_doc.total_deferred_taxes
    payment_entry = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Pay",
        "posting_date": datetime.today(),
        "paid_from": "Bank Account",  # Replace with actual bank account
        "paid_to": "Deferred Tax Liability Account",  # Replace with actual deferred tax account
        "references": []
    })

    for tax in po_doc.deferred_taxes:
        payment_entry.append("references", {
            "reference_doctype": "Fuel Purchase Order",
            "reference_name": po_doc.name,
            "total_amount": tax.amount,
            "outstanding_amount": tax.amount
        })

    payment_entry.paid_amount = total_deferred_taxes
    payment_entry.insert()
    payment_entry.submit()


class FuelLiftingOrder(Document):
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
		


