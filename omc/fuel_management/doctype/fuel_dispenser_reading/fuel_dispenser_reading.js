// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt


// Main trigger for 'outlet' field
frappe.ui.form.on("Fuel Dispenser Reading", {
    // Triggered when the 'outlet' field changes
    outlet: function(frm) {
        let outlet = frm.doc.outlet;
        
        if (!outlet) {
            console.error("No 'outlet' value found.");
            return;
        }

        console.log(`Fetching data for outlet: ${outlet}`);

        // Try to fetch the last fuel dispenser reading for the outlet
        fetch_last_fuel_dispenser_reading(frm, outlet);
    },
    // Preserve outlet field on save
    before_save: function(frm) {
        if (!frm.doc.outlet) {
            frappe.throw("Outlet is required before saving.");
        }
    }
});

// Function to fetch the last fuel dispenser reading
function fetch_last_fuel_dispenser_reading(frm, outlet) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Fuel Dispenser Reading",
            filters: { outlet: outlet },
            order_by: "creation desc",
            limit_page_length: 1
        },
        callback: function(response) {
            if (response.message) {
                console.log("Last reading found:", response.message);
                // Populate child tables from last reading
                populate_child_tables_from_last_reading(frm, response.message);
            } else {
                console.log("No last reading found, fetching pump and attendant details.");
                // Fetch pump and attendant details as fallback
                fetch_pump_and_attendant_details(frm, outlet);
            }
        }
    });
}

// Helper function to populate child tables from last reading
function populate_child_tables_from_last_reading(frm, last_reading) {
    // Clear existing rows in child tables
    frm.clear_table("ago_pump_readings_diesel");
    frm.clear_table("pms_pump_readings_petrol");

    // Loop through AGO pump readings
    if (last_reading.ago_pump_readings_diesel) {
        last_reading.ago_pump_readings_diesel.forEach(row => {
            let child_row = frm.add_child("ago_pump_readings_diesel");
            child_row.pump = row.pump;
            //child_row.attendant = row.attendant;
            child_row.last_reading = row.current_reading;
        });
    }

    // Loop through PMS pump readings
    if (last_reading.pms_pump_readings_petrol) {
        last_reading.pms_pump_readings_petrol.forEach(row => {
            let child_row = frm.add_child("pms_pump_readings_petrol");
            child_row.pump = row.pump;
           // child_row.attendant = row.attendant;
            child_row.last_reading = row.current_reading;
        });
    }

    frm.refresh_field("ago_pump_readings_diesel");
    frm.refresh_field("pms_pump_readings_petrol");
}

// Helper function to fetch pump and attendant details and update child tables
function fetch_pump_and_attendant_details(frm, outlet) {
    console.log(`Initiating fetch for pump and attendant details for outlet: ${outlet}`);

    // Fetch pump details
    frappe.call({
        method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.pumpdetails",
        args: { dispense: outlet },
        callback: function(response) {
            if (!response || response.exc) {
                console.error("Error fetching pump details", response);
                return;
            }
            console.log("Pump details fetched successfully:", response.message);
            process_pump_details(frm, response.message);
        }
    });

    // Fetch attendant details
    frappe.call({
        method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.attendetails",
        args: { atted: outlet },
        callback: function(response) {
            if (!response || response.exc) {
                console.error("Error fetching attendant details", response);
                return;
            }
            console.log("Attendant details fetched successfully:", response.message);
            process_attendant_details(frm, response.message);
        }
    });
}

// Helper function to process and update pump details
function process_pump_details(frm, pump_data) {
    if (!pump_data) {
        console.warn("No valid pump data received.");
        return;
    }

    let pumps = Array.isArray(pump_data.message) ? pump_data.message : Object.values(pump_data.message);

    // Clear and populate AGO and PMS tables from pump data
    frm.clear_table("ago_pump_readings_diesel");
    frm.clear_table("pms_pump_readings_petrol");

    pumps.forEach(pump => {
        if (/AGO/i.test(pump)) {
            let child_row = frm.add_child("ago_pump_readings_diesel");
            child_row.pump = pump;
        }
        if (/PMS/i.test(pump)) {
            let child_row = frm.add_child("pms_pump_readings_petrol");
            child_row.pump = pump;
        }
    });

    frm.refresh_field("ago_pump_readings_diesel");
    frm.refresh_field("pms_pump_readings_petrol");
}

// Helper function to process and update attendant details
function process_attendant_details(frm, attendant_data) {
    if (!attendant_data) {
        console.warn("No valid attendant data received.");
        return;
    }

    let attendants = Array.isArray(attendant_data.message) ? attendant_data.message : Object.values(attendant_data.message);

    frm.fields_dict.ago_pump_readings_diesel.grid.update_docfield_property('attendant', "options", attendants);
    frm.fields_dict.pms_pump_readings_petrol.grid.update_docfield_property('attendant', "options", attendants);

    frm.refresh_field("ago_pump_readings_diesel");
    frm.refresh_field("pms_pump_readings_petrol");
}


frappe.ui.form.on("Pump Readings", "difference", function(frm, cdt, cdn) {

    // AGO calculations
    let ago_total_litres = 0;

    // Ensure ago_pump_readings_diesel is defined and an array
    if (Array.isArray(frm.doc.ago_pump_readings_diesel)) {
        frm.doc.ago_pump_readings_diesel.forEach(function(item) {
            ago_total_litres += item.difference || 0; // Handle undefined differences safely
        });
    } else {
        console.warn("ago_pump_readings_diesel is undefined or not an array");
    }

    frm.set_value('ago_litres_sold', ago_total_litres);
    
    if (frm.doc.rtt == 1) {
        let total_ago_after_rtt = ago_total_litres - (frm.doc.ago_litres_used || 0);
        frm.set_value('ago_litres_sold', total_ago_after_rtt);

        // Calculate total sales
        let ago = total_ago_after_rtt * (frm.doc.ago_rate || 0);
        frm.set_value('ago_sales', ago);
    } else {
        // Calculate total sales
        let ago = ago_total_litres * (frm.doc.ago_rate || 0);
        frm.set_value('ago_sales', ago);
    }

    // PMS calculations
    let pms_total_litres = 0;

    // Ensure pms_pump_readings_petrol is defined and an array
    if (Array.isArray(frm.doc.pms_pump_readings_petrol)) {
        frm.doc.pms_pump_readings_petrol.forEach(function(item) {
            pms_total_litres += item.difference || 0; // Handle undefined differences safely
        });
    } else {
        console.warn("pms_pump_readings_petrol is undefined or not an array");
    }

    frm.set_value('pms_litres_sold', pms_total_litres);

    if (frm.doc.rtt == 1) {
        let total_pms_after_rtt = pms_total_litres - (frm.doc.pms_litres_used || 0);
        frm.set_value('pms_litres_sold', total_pms_after_rtt);

        let pms = total_pms_after_rtt * (frm.doc.pms_rate || 0);
        frm.set_value('pms_sales', pms);
    } else {
        let pms = pms_total_litres * (frm.doc.pms_rate || 0);
        frm.set_value('pms_sales', pms);
    }

    // Calculate total sales or other operations as needed...
    total_sales = frm.doc.pms_sales + frm.doc.ago_sales
    frm.set_value('total_sales' , total_sales)
});