frappe.ui.form.on("Fuel Dispenser Reading", {
    outlet: function(frm) {
        let dispense = frm.doc.outlet;
        if (dispense) {
            console.log("Calling API for attendetails with dispense:", dispense);
    
            // First API Call for Dispense Details
            frappe.call({
                method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.attendetails",
                args: { dispense: dispense },
                callback: function(r) {
                    console.log("Full response from attendetails:", r);

                    // Check if message is an array, object, or invalid
                    if (r.message) {
                        let pump_names = Array.isArray(r.message.message)
                            ? r.message.message // If it's an array, use it directly
                            : Object.values(r.message.message); // If it's an object, get the values
                        
                        console.log("Pump names processed:", pump_names);

                        if (Array.isArray(pump_names)) {
                            // Update options for AGO Pump
                           // frm.fields_dict.ago__pump_readings_diesel.grid.get_field('pump').df.options = [''].concat(pump_names);
                            frm.fields_dict.ago__pump_readings_diesel.grid.update_docfield_property("pump","options", pump_names)
                            frm.refresh_field('ago__pump_readings_diesel');

                            // Update options for PMS Pump
                           // frm.fields_dict.pms_pump_readings_petrol.grid.get_field('pump').df.options = [''].concat(pump_names);
                            frm.fields_dict.pms_pump_readings_petrol.grid.update_docfield_property("pump","options", pump_names)

                            
                            frm.refresh_field('pms_pump_readings_petrol');
                        } else {
                            console.warn("Pump names is not an array:", pump_names);
                        }
                    } else {
                        console.warn("Unexpected data structure or no valid message in attendetails response:", r);
                    }
                }
            });

            // Second API Call for Attendant Details
            frappe.call({
                method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.pumpdetails",
                args: { atted: dispense },
                callback: function(d) {
                    console.log("Full response from pumpdetails:", d);

                    if (d.message) {
                        let attendant_names = Array.isArray(d.message.message)
                            ? d.message.message
                            : Object.values(d.message.message);

                        console.log("Attendant names processed:", attendant_names);

                        if (Array.isArray(attendant_names)) {
                            // Update options for AGO Pump Attendant
                            //frm.fields_dict.ago__pump_readings_diesel.grid.get_field('attendant').df.options = [''].concat(attendant_names);
                            frm.fields_dict.ago__pump_readings_diesel.grid.update_docfield_property("attendant","options", attendant_names)

                            frm.refresh_field('ago__pump_readings_diesel');

                            // Update options for PMS Pump Attendant
                           // frm.fields_dict.pms_pump_readings_petrol.grid.get_field('attendant').df.options = [''].concat(attendant_names);
                            frm.fields_dict.pms_pump_readings_petrol.grid.update_docfield_property("attendant","options", attendant_names)

                            frm.refresh_field('pms_pump_readings_petrol');
                        } else {
                            console.warn("Attendant names is not an array:", attendant_names);
                        }
                    } else {
                        console.warn("Unexpected data structure or no valid message in pumpdetails response:", d);
                    }
                }
            });
        } else {
            console.error("No 'dispense' value found in frm.doc.outlet");
        }
    }
});
