# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt

from frappe.model.document import Document


class DeferredStatutoryPayment(Document):
    # Trigger: on_submit for Deferred Statutory Payment
	def on_submit(doc, method):
		    # Validate tax amount
		if flt(doc.tax_amount) <= 0:
			frappe.throw("Tax Amount must be greater than 0 to create a Journal Entry.")
		journal_entry = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": "Bank Entry",
        "posting_date": frappe.utils.nowdate(),
        "accounts": [
            {
                "account": doc.account,  # Debit account from Deferred Statutory Payment
                "debit_in_account_currency": doc.tax_amount,  # Debit the tax amount
                "cost_center": doc.cost_center  # Add cost center if provided
            },
            {
                "account": "Bank",  # Replace with your bank/cash account
                "credit_in_account_currency": doc.tax_amount  # Credit the tax amount
            }
        ],
        "user_remark": f"Payment for Deferred Statutory Payment: {doc.name}"
    })
		journal_entry.insert(ignore_permissions=True)
		journal_entry.submit()
		    # Notify users about the Journal Entry creation
		frappe.msgprint(f"Journal Entry {journal_entry.name} has been created and submitted for Deferred Statutory Payment {doc.name}.")
	
