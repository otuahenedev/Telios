# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class OutletFuelTank(Document):
	pass

def update_reorder_levels():
    """
    Update reorder levels for all Outlet Fuel Tanks based on ADS.
    """
    tanks = frappe.get_all("Outlet Fuel Tank", fields=["name", "outlet", "product", "safety_stock_l", "lead_time"])

    for tank in tanks:
        try:
            # Calculate the reorder level
            reorder_level = calculate_reorder_level(
                outlet=tank["outlet"],
                product=tank["product"],
                safety_stock=tank["safety_stock_l"],
                lead_time_days=tank["lead_time"]
            )

            # Update the reorder level in the Outlet Fuel Tank
            frappe.db.set_value("Outlet Fuel Tank", tank["name"], "reorder_level_l", reorder_level)
        except Exception as e:
            # Log the error and proceed
            frappe.log_error(f"Failed to update reorder level for Tank {tank['name']}: {str(e)}", "Reorder Level Update Error")

    frappe.msgprint("Reorder levels updated successfully.")

def calculate_reorder_level(outlet, product, safety_stock, lead_time_days):
    """
    Calculate the reorder level for a product at a given outlet.
    """
    # Get the ADS for the product
    ads = calculate_average_daily_sales(product, outlet)

    # Calculate the reorder level
    reorder_level = (ads * lead_time_days) + safety_stock

    return reorder_level

def calculate_average_daily_sales(product, outlet, days=30):
    """
    Calculate Average Daily Sales (ADS) for a specific product and outlet
    by aggregating data from the 'totals' child table in Pump Sales.
    """
    # Calculate the start date for the period
    start_date = frappe.utils.add_days(frappe.utils.today(), -days)

    # Query the child table 'totals' for the given product and outlet
    sales_data = frappe.db.sql("""
        SELECT SUM(child.total_volume_sold_l) AS total_volume
        FROM `tabOutlet Pump Sales` parent
        JOIN `tabPump Reading Totals` child ON child.parent = parent.name
        WHERE child.product = %s AND parent.outlet = %s AND parent.creation >= %s
    """, (product, outlet, start_date), as_dict=True)

    total_volume = sales_data[0].total_volume or 0  # Default to 0 if no sales found

    # Calculate ADS
    average_daily_sales = total_volume / days

    return average_daily_sales


# def notify_low_stock():
#     """
#     Notify users when stock levels fall below reorder levels.
#     """
#     # Fetch tanks where the current level is below the reorder level
#     tanks = frappe.get_all(
#         "Outlet Fuel Tank",
#         filters={"current_level_l": ["<", "reorder_level_l"]},
#         fields=["name", "outlet", "product", "current_level_l", "reorder_leve_l"]
#     )

#     if not tanks:
#         return  # No low stock tanks; nothing to notify

#     # Build notifications for each tank
#     for tank in tanks:
#         # Create a notification message
#         message = f"""
#             🚨 <b>Low Stock Alert</b><br>
#             Tank <b>{tank['name']}</b> (Product: <b>{tank['product']}</b>) at Outlet <b>{tank['outlet']}</b>
#             has fallen below its reorder level.<br>
#             <b>Current Level:</b> {tank['current_level_l']} liters<br>
#             <b>Reorder Level:</b> {tank['reorder_level_l']} liters<br>
#             Please restock immediately.
#         """

#         # Create system notification for all users with Stock Manager role
#         users = frappe.get_all("User", filters={"role_profile_name": "Stock User"}, pluck="name")
#         for user in users:
#             frappe.get_doc({
#                 "doctype": "Notification Log",
#                 "for_user": user,
#                 "type": "Alert",
#                 "document_type": "Outlet Fuel Tank",
#                 "subject": "🚨 Low Stock Alert",
#                 "email_content": message
#             }).insert(ignore_permissions=True)

#     frappe.msgprint("Low stock system notifications have been created.")