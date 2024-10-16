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
        args: {  dispense: outlet  },
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
        args: { atted: outlet},
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

    let names = Array.isArray(message.message) ? message.message : Object.values(message.message);
    if (!Array.isArray(names)) {
        console.warn(`${field} names is not an array:`, names);
        return;
    }

    frm.fields_dict.ago_pump_readings_diesel.grid.update_docfield_property(field, "options", names);
    frm.fields_dict.pms_pump_readings_petrol.grid.update_docfield_property(field, "options", names);

    frm.refresh_field("ago_pump_readings_diesel");
    frm.refresh_field("pms_pump_readings_petrol");
}


// Pump Readings calculations
