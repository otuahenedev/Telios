import frappe
from frappe.model.document import Document

class OutletFuelDischargeLog(Document):
    pass

@frappe.whitelist()
def create_stock_entry_on_submit(doc, method):
    # Validate Total Fuel Delivered
    if not doc.total_fuel_delivered or doc.total_fuel_delivered <= 0:
        frappe.throw("Cannot create Stock Entry: Total Fuel Delivered is zero or invalid.")

    # Validate Fuel Tank (Warehouse)
    if not doc.fuel_tank:
        frappe.throw("Fuel Tank is missing. Please select a valid Fuel Tank (linked to a Warehouse).")

    # Validate Product Name (Fuel Type)
    if not doc.product_name:
        frappe.throw("Product Name is missing. Please ensure the product is selected.")

    # Create a new Stock Entry
    stock_entry = frappe.new_doc("Stock Entry")
    stock_entry.posting_date = frappe.utils.today()
    stock_entry.posting_time = frappe.utils.nowtime()
    stock_entry.stock_entry_type = "Material Receipt"

    # Add the Total Fuel Delivered as a single line item
    stock_entry.append("items", {
        "item_code": doc.product_name,              # Fuel product (AGO, PMS, etc.)
        "qty": doc.total_fuel_delivered,            # Total fuel delivered
        "t_warehouse": doc.fuel_tank,               # Warehouse (Fuel Tank)
        "valuation_rate": 0                         # Optional: Add a valuation rate if needed
    })

    # Save and Submit the Stock Entry
    try:
        stock_entry.insert()
        stock_entry.submit()
        frappe.msgprint(f"Stock Entry {stock_entry.name} created successfully!")
    except Exception as e:
        frappe.throw(f"Error creating Stock Entry: {str(e)}")

# Link this function directly to on_submit in Outlet Fuel Discharge Log
def on_submit(doc, method):
    create_stock_entry_on_submit(doc, method)