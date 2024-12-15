// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

 frappe.ui.form.on("Credit Application", {
    before_workflow_action: async (frm) => {
        let promise = new Promise((resolve, reject) => {
         frappe.dom.unfreeze()
            frappe.confirm(
                "<b>Are all of the below fields entered correctly?</b><ul>",
                () => resolve(), // User confirms
                () => reject()   // User rejects
            );
        });
        await promise.catch(() => frappe.throw()); // If the promise is rejected, throw an error
    },
// 	refresh(frm) {

// 	},
 });
