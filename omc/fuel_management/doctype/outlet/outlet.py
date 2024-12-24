# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Outlet(Document):
	def validate(self):
		update_oft_tank_capacity(self)




def update_oft_tank_capacity(self):
    """
    Calculate total tank capacity per product in Station and update corresponding OFT records.
    """
    # Initialize a dictionary to store total capacities by product
    product_capacity_map = {}

    # Loop through tanks in the Station's child table
    for tank in self.tanks:
        if not tank.product or not tank.oft or not tank.volume:
            frappe.throw("All fields (OFT, Product, Capacity) in the Tanks table must be filled.")

        # Sum capacities by product
        product_capacity_map[tank.product] = product_capacity_map.get(tank.product, 0) + tank.volume

    # Fetch all OFT records linked to this Station
    oft_records = frappe.get_all(
        "Outlet Fuel Tank",
        filters={"outlet": self.name},
        fields=["name", "product"]
    )

    # Update tank_capacity in OFT records
    for oft in oft_records:
        if oft["product"] in product_capacity_map:
            frappe.db.set_value("Outlet Fuel Tank", oft["name"], "tank_capacity_l", product_capacity_map[oft["product"]])
        else:
            frappe.msgprint(
                f"No tanks found for product {oft['product']} in Outlet {self.name}.",
                alert=True
            )