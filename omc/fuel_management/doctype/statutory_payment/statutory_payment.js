// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Statutory Payment", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on("Statutory Payment", {
    refresh: function(frm) {
        if (frm.doc.status === "Unpaid") {
            frm.add_custom_button("Record Payment", () => {
                create_payment_entry(frm);
            }).addClass("btn-primary");
        }
    }
});

function create_payment_entry(frm) {
    frappe.new_doc("Payment Entry", {
        payment_type: "Pay", // Payment type: Pay for outgoing payments
        party_type: "Account", // Assuming taxes are paid to accounts
        party: frm.doc.tax_name, // Use the tax name or appropriate party
        paid_amount: frm.doc.total_tax_amount, // Total tax amount from Statutory Payment
        reference_no: frm.doc.name, // Reference Statutory Payment name
        reference_date: frappe.datetime.now_date(), // Default to today
        custom_reference_doc: "Statutory Payment", // Reference document type
        custom_reference_name: frm.doc.name // Reference document name
    });
}