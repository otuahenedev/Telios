// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

 frappe.ui.form.on("Fuel Delivery Verification", {
 	refresh(frm) {
        frappe.db.get_value("Employee", {
            "user_id": frappe.session.user
        }, ['name'],
        function (value) {
            console.log("Employee ID", value.name);
            frm.set_value("station_supervisor", value.name);
        });
        

	},
 });
