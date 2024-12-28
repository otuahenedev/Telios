// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt
frappe.ui.form.on("Outlet Fuel Discharge Log", {
    product: function (frm) {
        let product = frm.doc.product;
        if (!product || !frm.doc.outlet) {
            frappe.msgprint(__('Please select a product and outlet.'));
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
                    if (outlet.tanks) {
                        const filtered_tanks = outlet.tanks.filter(tank => tank.product === frm.doc.product);

                        if (filtered_tanks.length === 0) {
                            frappe.msgprint(__('No tanks found for the selected Outlet with the selected Product.'));
                        } else {
                            filtered_tanks.forEach(tank => {
                                if (tank.status === "Active") {
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
                    if (outlet.fuel_dispensers) {
                        const filtered_pumps = outlet.fuel_dispensers.filter(pump => pump.product === frm.doc.product);

                        if (filtered_pumps.length === 0) {
                            frappe.msgprint(__('No pumps found for the selected Outlet with the selected Product.'));
                        } else {
                            filtered_pumps.forEach(pump => {
                                if (pump.status === "Active") {
                                    let pump_child = frm.add_child('pump_activity'); // Add row to the pump_activity table
                                    pump_child.dispenser = pump.dispenser; // Populate dispenser
                                    pump_child.product = pump.product; // Populate product
                                }
                            });
                            frm.refresh_field('pump_activity'); // Refresh the pump_activity table
                        }
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
        calculate_net_sales_and_totals(frm);
    

    },
    
});
frappe.ui.form.on('Pump Activity', {
    // Trigger when any field in the child table row changes
    before_discharge: function (frm, cdt, cdn) {
        update_net_sales(frm, cdt, cdn);
    },
    after_discharge: function (frm, cdt, cdn) {
        update_net_sales(frm, cdt, cdn);
    }
});

frappe.ui.form.on('Tank Activity', {
    // Trigger when any field in the child table row changes
    tank_volume_before_delivery: function (frm, cdt, cdn) {
        update_tank_net_volume(frm, cdt, cdn);
    },
    tank_volume_after_delivery: function (frm, cdt, cdn) {
        update_tank_net_volume(frm, cdt, cdn);
    }
});


// Function to calculate net_sales for a single row and validate inputs
function update_net_sales(frm, cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);


    if (row.before_discharge < 0 || row.after_discharge < 0) {
        frappe.msgprint(__('Values for "Before" or "After" cannot be negative.'), __("Validation Error"));
        frappe.model.set_value(cdt, cdn, 'volume_sold_l', 0);
        return;
    }

    if (row.after_discharge < row.before_discharge) {
        frappe.msgprint(__('"After" value cannot be less than "Before" value.'), __("Validation Error"));
        frappe.model.set_value(cdt, cdn, 'volume_sold_l', 0);
        return;
    }

    // Calculate net_sales
    let net_sales = row.after_discharge - row.before_discharge;
    frappe.model.set_value(cdt, cdn, 'volume_sold_l', net_sales);

    // Recalculate totals on the parent
    calculate_net_sales_and_totals(frm);
    calculate_net_volume_and_totals(frm);
    calculate_actual_levels(frm);
}

// Function to calculate total net_sales across all rows in the child table
function calculate_net_sales_and_totals(frm) {
    let total_net_sales = 0;

    if (frm.doc.pump_activity) {
        frm.doc.pump_activity.forEach(row => {
            if (row.volume_sold_l) {
                total_net_sales += row.volume_sold_l;
            }
        });
    }

    // Set the total in the parent field
    frm.set_value('total_sales_during_discharge_l', total_net_sales);
    console.log(total_net_sales)
}



// Function to calculate net_tank for a single row and validate inputs
function update_tank_net_volume(frm, cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);

    if (row.tank_volume_before_delivery < 0 || row.tank_volume_after_delivery < 0) {
        frappe.msgprint(__('Values for "Before" or "After" cannot be negative.'), __("Validation Error"));
        frappe.model.set_value(cdt, cdn, 'net_volume', 0);
        return;
    }

    if (row.tank_volume_after_delivery < row.tank_volume_before_delivery) {
        frappe.msgprint(__('"After" value cannot be less than "Before" value.'), __("Validation Error"));
        frappe.model.set_value(cdt, cdn, 'net_volume', 0);
        return;
    }

    // Calculate net_sales
    let net_sales = row.tank_volume_after_delivery - row.tank_volume_before_delivery;
    frappe.model.set_value(cdt, cdn, 'net_volume', net_sales);

    // Recalculate totals on the parent
    calculate_net_volume_and_totals(frm);
}

// Function to calculate total net_sales across all rows in the child table
function calculate_net_volume_and_totals(frm) {
    let total_net_volume = 0;

    if (frm.doc.tank_activity) {
        frm.doc.tank_activity.forEach(row => {
            if (row.net_volume) {
                total_net_volume += row.net_volume;
            }
        });
    }

    // Set the total in the parent field
    frm.set_value('total_tanks_net_volume_l', total_net_volume);
    console.log(total_net_volume)
}

function calculate_actual_levels(frm) {
    let tsddl = frm.doc.total_sales_during_discharge_l || 0 
    let ttnvl = frm.doc.total_tanks_net_volume_l || 0 
    if ( tsddl && ttnvl){
        let fuel_recieved = ttnvl - tsddl;
        frm.set_value('fuel_received_l', fuel_recieved);
     }
     else {
        // Handle cases where values are missing
        frappe.msgprint(__('Please ensure both Pump Activity  and Tank Activity tables are filled.'));
    }
}