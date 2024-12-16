# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class OutletPricing(Document):
	pass


@frappe.whitelist()
def update_outlet_pricing_from_competitor(outlet):
    # Fetch competitor pricing for the last 2 weeks
    competitor_data = frappe.db.sql("""
        SELECT product, 
               AVG(rate) AS avg_price, 
               MIN(rate) AS lowest_price
        FROM `tabCompetitor Pricing` AS cp
        JOIN `tabCompetitor Pricing Item` AS cpi ON cp.name = cpi.parent
        WHERE cp.outlet = %s 
        AND cp.capture_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        GROUP BY product
    """, (outlet), as_dict=True)

    # Update Outlet Pricing
    for row in competitor_data:
        frappe.db.set_value("Singles", "Outlet Pricing", f"{row.product}_avg_competitor_price", row.avg_price)
        frappe.db.set_value("Singles", "Outlet Pricing", f"{row.product}_lowest_competitor_price", row.lowest_price)
        

def update_customer_product_pricing(outlet):
    # Fetch outlet pricing data
    outlet_pricing = frappe.get_doc("Outlet Pricing", outlet)

    # Fetch the customer linked to this outlet
    customer = frappe.db.get_value("Customer", {"outlet_name": outlet}, "name")
    customer_doc = frappe.get_doc("Customer", customer)

    # Update the Product Pricing child table
    for product in outlet_pricing.pricing_table:
        for item in customer_doc.product_pricing:
            if item.product == product.product:
                item.rate = product.final_selling_price

    customer_doc.save()
    



@frappe.whitelist()
def calculate_proposed_selling_price(outlet):
    # Fetch Outlet Pricing data
    outlet_pricing = frappe.get_doc("Outlet Pricing", outlet)

    # Loop through each fuel type in the Fuel Pricing Table
    for product in outlet_pricing.fuel_pricing_table:
        # Ensure purchase_price is calculated or provided
        if not product.purchase_price:
            product.purchase_price = calculate_purchase_price(outlet, product.fuel_type)

        # Fetch competitor pricing: lowest and average
        competitor_prices = fetch_competitor_prices(outlet, product.fuel_type)
        product.lowest_competitor_price = competitor_prices.get('lowest', 0)
        product.avg_competitor_price = competitor_prices.get('average', 0)

        # Fetch profit margin from the child table
        profit_margin = product.profit_margin or 0  # Default to 0 if not provided

        # Calculate Proposed Selling Price
        proposed_price = max(
            product.purchase_price * (1 + profit_margin / 100),
            product.lowest_competitor_price
        )

        # Update Proposed Selling Price in the table
        product.proposed_selling_price = proposed_price

    # Save the updated document
    outlet_pricing.save()

    return "Proposed selling prices updated successfully."

#Queries the Competitor Pricing and its child table Competitor Pricing Item to fetch: The lowest competitor price. The average competitor price.
def fetch_competitor_prices(outlet, fuel_type):
    # Query competitor pricing data
    competitor_data = frappe.db.sql("""
        SELECT MIN(rate) as lowest, AVG(rate) as average
        FROM `tabCompetitor Pricing Item` as cpi
        JOIN `tabCompetitor Pricing` as cp ON cp.name = cpi.parent
        WHERE cp.outlet = %s AND cpi.fuel_type = %s 
        AND cp.capture_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
    """, (outlet, fuel_type), as_dict=True)

    # Return the calculated lowest and average prices
    if competitor_data:
        return {
            'lowest': competitor_data[0].lowest or 0,
            'average': competitor_data[0].average or 0
        }
    return {'lowest': 0, 'average': 0}


#Derived using purchase invoices and landed costs for the specified outlet and fuel type within the 14-day window.
def calculate_purchase_price(outlet, fuel_type):
    import datetime
    from frappe.utils import nowdate, add_days

    # Define the 2-week pricing window
    end_date = nowdate()
    start_date = add_days(end_date, -14)

    # Fetch purchase invoices for the 2-week window
    invoices = frappe.db.sql("""
        SELECT sum(grand_total) as total_invoice, sum(qty) as total_qty
        FROM `tabPurchase Invoice Item`
        WHERE outlet = %s AND item_code = %s AND posting_date BETWEEN %s AND %s
    """, (outlet, fuel_type, start_date, end_date), as_dict=True)

    # Fetch landed costs for the same window
    landed_cost = frappe.db.sql("""
        SELECT sum(total_cost) as total_landed
        FROM `tabLanded Cost Voucher`
        WHERE outlet = %s AND item_code = %s AND posting_date BETWEEN %s AND %s
    """, (outlet, fuel_type, start_date, end_date), as_dict=True)

    # Calculate purchase price
    total_invoice = invoices[0].total_invoice or 0
    total_qty = invoices[0].total_qty or 1  # Avoid division by zero
    total_landed = landed_cost[0].total_landed or 0

    return (total_invoice + total_landed) / total_qty


@frappe.whitelist()
def update_customer_product_pricing(doc, method):
    """
    Updates the rate in the Product Pricing table of the linked Customer
    whenever Outlet Pricing is saved.
    """
    # Ensure the Outlet Pricing document has the required fields
    if not doc.outlet or not doc.pricing_table:
        return

    # Get the linked customer
    customer = frappe.get_value("Customer", {"outlet_name": doc.outlet}, "name")
    if not customer:
        frappe.throw(f"No customer found linked to the outlet {doc.outlet}.")

    # Fetch the Customer document
    customer_doc = frappe.get_doc("Customer", customer)

    # Update Product Pricing table
    for pricing_row in doc.pricing_table:
        for product_row in customer_doc.product_pricing:
            if product_row.product == pricing_row.product:
                product_row.rate = pricing_row.selling_price

    # Save the updated Customer document
    customer_doc.save()