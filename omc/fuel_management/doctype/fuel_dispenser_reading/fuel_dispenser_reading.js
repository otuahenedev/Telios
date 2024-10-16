// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt


// Main trigger for 'outlet' field
frappe.ui.form.on("Fuel Dispenser Reading", {
    outlet: function(frm) {
        let outlet = frm.doc.outlet;
        
        if (!outlet) {
            console.error("No 'outlet' value found.");
            return;
        }

        console.log(`Fetching data for outlet: ${outlet}`);

        // Fetch pump and attendant details based on outlet
        fetch_pump_and_attendant_details(frm, outlet);
    }
});

// Helper function to fetch pump and attendant details and update child table options
function fetch_pump_and_attendant_details(frm, outlet) {
    console.log(`Initiating fetch for pump and attendant details for outlet: ${outlet}`);

    // Fetch pump details
    frappe.call({
        method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.attendetails",
        args: { dispense: outlet },
        callback: function(response) {
            if (!response || response.exc) {
                console.error("Error fetching pump details", response);
                return;
            }
            console.log("Pump details fetched successfully:", response.message);
            process_pump_details(frm, response.message, "pump");
        }
    });

    // Fetch attendant details
    frappe.call({
        method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.pumpdetails",
        args: { atted: outlet },
        callback: function(response) {
            if (!response || response.exc) {
                console.error("Error fetching attendant details", response);
                return;
            }
            console.log("Attendant details fetched successfully:", response.message);
            process_pump_details(frm, response.message, "attendant");
        }
    });
}

// Helper function to process and update child table fields for pump/attendant
function process_pump_details(frm, message, field) {
    if (!message) {
        console.warn("No valid message received.");
        return;
    }

    // Ensure message is an array
    let names = Array.isArray(message.message) ? message.message : Object.values(message.message);
    if (!Array.isArray(names)) {
        console.warn(`${field} names is not an array:`, names);
        return;
    }

    // Separate filtering for AGO and PMS
    let ago_names = [];
    let pms_names = [];

    // Clear the child tables first
    frm.clear_table("ago_pump_readings_diesel");
    frm.clear_table("pms_pump_readings_petrol");

    // Filter names for AGO and PMS and add them to the respective child tables
    names.forEach(name => {
        if (/AGO/i.test(name)) {  // Case-insensitive match for 'AGO'
            let child_row = frm.add_child("ago_pump_readings_diesel");
            child_row[field] = name;  // Use 'attendant' or 'pump' based on the field
            ago_names.push(name);  // Collect names for grid options
        }
        if (/PMS/i.test(name)) {  // Case-insensitive match for 'PMS'
            let child_row = frm.add_child("pms_pump_readings_petrol");
            child_row[field] = name;  // Use 'attendant' or 'pump' based on the field
            pms_names.push(name);  // Collect names for grid options
        }
    });

    // Ensure the correct grid options are set based on the attendant or pump
    if (field === "attendant") {
        frm.fields_dict.ago_pump_readings_diesel.grid.update_docfield_property('attendant', "options", ago_names);
        frm.fields_dict.pms_pump_readings_petrol.grid.update_docfield_property('attendant', "options", pms_names);
    } else if (field === "pump") {
        frm.fields_dict.ago_pump_readings_diesel.grid.update_docfield_property('pump', "options", ago_names);
        frm.fields_dict.pms_pump_readings_petrol.grid.update_docfield_property('pump', "options", pms_names);
    }

    // Refresh the child tables to display the updated rows
    frm.refresh_field("ago_pump_readings_diesel");
    frm.refresh_field("pms_pump_readings_petrol");

    console.log(`AGO names: ${ago_names}`);
    console.log(`PMS names: ${pms_names}`);
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
});