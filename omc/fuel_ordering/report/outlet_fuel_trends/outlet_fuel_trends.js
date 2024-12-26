// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

frappe.query_reports["Outlet Fuel Trends"] = {
    "filters": [
        {
            "fieldname": "product",
            "label": __("Product"),
            "fieldtype": "Link",
            "options": "Item",
            "reqd": 1
        },
        {
            "fieldname": "outlets",
            "label": __("Outlets"),
            "fieldtype": "MultiSelectList",
            "options": "Outlet",
            "get_data": function(txt) {
                return frappe.db.get_link_options("Outlet", txt);
            },
            "reqd": 0  // Optional field
        }
    ],
    "formatter": function (value, row, column, data, default_formatter) {
        if (column.fieldname === "stock_lifespan_days") {
            value = value ? `${value.toFixed(2)} Days` : "N/A";
        }
        return default_formatter(value, row, column, data);
    },
    "get_data": function (filters) {
        frappe.call({
            method: "omc.fuel_ordering.report.outlet_fuel_trends.outlet_fuel_trends.get_outlet_fuel_report",
            args: { filters },
            callback: function (response) {
                frappe.query_report.data = response.message || [];
                frappe.query_report.refresh();
            }
        });
    },
    "columns": [
        {
            "fieldname": "outlet",
            "label": __("Outlet"),
            "fieldtype": "Link",
            "options": "Outlet",
            "width": 150
        },
        {
            "fieldname": "average_daily_sales_l",
            "label": __("Average Daily Sales (L)"),
            "fieldtype": "Float",
            "width": 150
        },
        {
            "fieldname": "current_stock_l",
            "label": __("Current Stock (L)"),
            "fieldtype": "Float",
            "width": 150
        },
        {
            "fieldname": "stock_lifespan_days",
            "label": __("Stock Lifespan (Days)"),
            "fieldtype": "Float",
            "width": 150
        },
        {
            "fieldname": "reorder_level_l",
            "label": __("Reorder Level (L)"),
            "fieldtype": "Float",
            "width": 150
        }
    ]
};