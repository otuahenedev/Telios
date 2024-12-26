// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt
frappe.ui.form.on("Outlet Fuel Discharge Log", {
    product: function (frm) {
        let product = frm.doc.product;
        if (!product) {
            frappe.msgprint(__('Please select an product and outlet.'));
            return;
        }

        // Clear the tables before fetching new data
        frm.clear_table('tank_activity');
        frm.clear_table('pump_activity');

        // Fetch tanks and pumps data from the selected outlet
        frappe.call({
            method: 'frappe.client.get',
            args: { doctype: "Outlet", name: frm.doc.outlet },
            callback: function (response) {
                let outlet = response.message;
                console.log("Outlet response:", outlet); // Log the response for debugging

                if (outlet) {
                    // Populate the tanks table
                    if (outlet.tanks ) {
                        const filtered_tanks = outlet.tanks.filter(tank => tank.product === frm.doc.product);

                        if (filtered_tanks.length === 0) {
                            frappe.msgprint(__('No tanks found for the selected Outlet with the selected Product.'));
                        } else {
                            filtered_tanks.forEach(tank => {
                               if (tank.status === "Active"){
                                    let child = frm.add_child('tank_activity'); // Add row to the tank_activity table
                                    child.tank_id = tank.tank_id; // Populate tank_id
                                    child.oft = tank.oft; // Populate oft
                                    child.product = tank.product; // Populate product
                                }
                            });
                            frm.refresh_field('tank_activity'); // Refresh the tank_activity table
                        }
                    } else {
                        frappe.msgprint(__('No tanks found for the selected Outlet.'));
                    }

                    // Populate the pumps table
                    if (outlet.fuel_dispensers ) {
                        outlet.fuel_dispensers.forEach(pump => {
                            if (pump.status === "Active"){
                                let pump_child = frm.add_child('pump_activity'); // Add row to the pump_activity table
                                pump_child.dispenser = pump.dispenser; 
                                pump_child.product = pump.product; // Populate product
                            }
                        });
                        frm.refresh_field('pump_activity'); // Refresh the pump_activity table
                    } else {
                        frappe.msgprint(__('No pumps found for the selected Outlet.'));
                    }
                } else {
                    frappe.msgprint(__('No data found for the selected Outlet.'));
                }
            },
            error: function () {
                frappe.msgprint(__('An error occurred while fetching tanks and pumps. Please try again.'));
            }
        });
    },

    validate: function (frm) {
        // Ensure that the tank_activity table is populated
        if (!frm.doc.tank_activity || frm.doc.tank_activity.length === 0) {
            frappe.msgprint(__('Please ensure the Tanks table is populated before submission.'));
            frappe.validated = false;
            return;
        }

        // Ensure that the pump_activity table is populated
        if (!frm.doc.pump_activity || frm.doc.pump_activity.length === 0) {
            frappe.msgprint(__('Please ensure the Pumps table is populated before submission.'));
            frappe.validated = false;
            return;
        }

        // Validate unique tank IDs in tanks
        let tank_ids = frm.doc.tank_activity.map(row => row.tank_id);
        if (new Set(tank_ids).size !== tank_ids.length) {
            frappe.msgprint(__('Duplicate Tank IDs detected in the Tanks table. Please fix the entries.'));
            frappe.validated = false;
            return;
        }

        // Validate unique pump IDs in pumps
        let pump_ids = frm.doc.pump_activity.map(row => row.pump_id);
        if (new Set(pump_ids).size !== pump_ids.length) {
            frappe.msgprint(__('Duplicate Pump IDs detected in the Pumps table. Please fix the entries.'));
            frappe.validated = false;
            return;
        }
    }
});