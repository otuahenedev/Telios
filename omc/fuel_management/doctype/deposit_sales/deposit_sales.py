# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DepositSales(Document):

    def on_submit(doc):
    # Check if the status is set to "Reviewed"
     if doc.status == "Reviewed":
        # Create a new Payment Entry
        payment_entry = frappe.get_doc({
            "doctype": "Payment Entry",
            "payment_type": "Receive",
            "party_type": "Customer",
            "party": doc.outlet,
            "paid_amount": doc.total_deposited,
            "received_amount": doc.total_deposited,
           # "paid_to": "",  # Update with the actual bank account in ERPNext
            "posting_date": frappe.utils.nowdate(),
            "references": [{
                "reference_doctype": "Deposit Sales",
                "reference_name": doc.name,
                "allocated_amount": doc.total_deposited
            }]
        })

        # Attach each deposit slip image from the child table to the Payment Entry
        for row in doc.sales_deposit:
            if row.deposit_slip_image:
                # Copy the image file to Payment Entry's attachments
                file_doc = frappe.get_doc("File", {"file_url": row.deposit_slip_image})
                file_doc.copy_to_doctype("Payment Entry", payment_entry.name)

        # Insert and Submit the Payment Entry
        payment_entry.insert(ignore_permissions=True)
        payment_entry.submit()

        # Optional: Show a message confirming the creation of the Payment Entry
        frappe.msgprint(f"Payment Entry created successfully for deposit: {doc.name}")

