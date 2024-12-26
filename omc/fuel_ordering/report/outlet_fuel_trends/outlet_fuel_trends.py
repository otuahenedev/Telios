# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt


import frappe
from frappe import _


def execute(filters: dict | None = None):
    """Return columns and data for the report."""
    columns = get_columns()
    data = get_outlet_fuel_report(filters)

    return columns, data


def get_columns() -> list[dict]:
    """Define the columns for the report."""
    return [
        {
            "label": _("Outlet"),
            "fieldname": "outlet",
            "fieldtype": "Link",
            "options": "Outlet",
            "width": 150,
        },
        {
            "label": _("Average Daily Sales (L)"),
            "fieldname": "average_daily_sales_l",
            "fieldtype": "Float",
            "width": 150,
        },
        {
            "label": _("Current Stock (L)"),
            "fieldname": "current_stock_l",
            "fieldtype": "Float",
            "width": 150,
        },
        {
            "label": _("Stock Lifespan (Days)"),
            "fieldname": "stock_lifespan_days",
            "fieldtype": "Float",
            "width": 150,
        },
        {
            "label": _("Reorder Level (L)"),
            "fieldname": "reorder_level_l",
            "fieldtype": "Float",
            "width": 150,
        },
    ]

@frappe.whitelist()
def get_outlet_fuel_report(filters=None):
    """
    Generate report for Outlet Fuel Tanks including ADS, Current Stock, Reorder Level, and Stock Lifespan.
    Filters: product, outlets (multiple selection).
    """
    filters = filters or {}
    product = filters.get("product")
    selected_outlets = filters.get("outlets")  # This will already be a list

    if not product:
        frappe.throw(_("Please select a product to generate the report."))

    # Prepare filters for Outlet Fuel Tank
    oft_filters = {"product": product}
    if selected_outlets:
        oft_filters["outlet"] = ["in", selected_outlets]  # Use the list directly

    # Fetch Outlet Fuel Tank data
    oft_data = frappe.get_all(
        "Outlet Fuel Tank",
        filters=oft_filters,
        fields=["outlet", "current_level_l", "reorder_level_l"]
    )

    report_data = []

    for oft in oft_data:
        # Fetch ADS data for the outlet
        sales_data = frappe.db.sql("""
            SELECT
                SUM(child.total_volume_sold_l) AS total_volume,
                COUNT(DISTINCT parent.creation) AS num_days
            FROM `tabOutlet Pump Sales` parent
            JOIN `tabPump Reading Totals` child ON child.parent = parent.name
            WHERE child.product = %s AND parent.outlet = %s
        """, (product, oft["outlet"]), as_dict=True)

        total_volume = sales_data[0].get("total_volume", 0) or 0
        num_days = sales_data[0].get("num_days", 0)
        ads = total_volume / num_days if num_days > 0 else 0
        stock_lifespan = ads > 0 and (oft["current_level_l"] / ads) or 0

        report_data.append({
            "outlet": oft["outlet"],
            "average_daily_sales_l": ads,
            "current_stock_l": oft["current_level_l"],
            "stock_lifespan_days": stock_lifespan,
            "reorder_level_l": oft["reorder_level_l"]
        })

    return report_data