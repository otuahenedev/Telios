// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

frappe.ui.form.on("Fuel Lifting Request", {

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
    fuel_type: function (frm) {
        // Refresh the table when the product field changes
        if (frm.doc.fuel_type) {
            render_fuel_data_table(frm);
            console.log("issue ")
        }
    },

    // REFRESH EVENT
    refresh: function(frm){
        if (frm.doc.docstatus == 1) {
            // Prevent duplicate button additions
            if (!frm.custom_buttons_added) {
                if (frappe.user.has_role('Accounts User')){
                    frm.add_custom_button("Create Purchase Invoice (Supplier)", () => create_purchase_invoice(frm))
                    .css({  'font-weight': 'bold' });
                    
                    frm.custom_buttons_added = true; // Track that buttons are added
        
                    // Button for Payment Entry (only for External Transport)
                    if (frm.doc.mode_of_transport === "External Transport") {
                        frm.add_custom_button("Create Payment Entry (Transport)", () => create_payment_entry(frm, "Transport"))
                            .css({  'font-weight': 'bold' });
                    }
        
                    // Button for Purchase Invoice
                    
                }
                if (frappe.user.has_role('Accounts User')){
                    frm.add_custom_button('Generate Outlet Delivery Notes', () => {
                        frappe.call({
                            method: "omc.fuel_ordering.doctype.fuel_lifting_request.fuel_lifting_request.generate_outlet_delivery_notes", // Replace with the actual path
                            args: {
                                docname: frm.doc.name
                            },
                            callback: function (r) {
                                if (r.message) {
                                    frappe.msgprint(r.message);
                                }
                            }
                        });
                    }) .css({  'font-weight': 'bold' });;

                }


                
               
              
            }
        }
        if (frm.doc.docstatus == 1 && frappe.user.has_roles('Logistics Officer')) {
            // Add button to generate Outlet Delivery Notes manually
            
        }
        if (frm.doc.fuel_type) {
            render_fuel_data_table(frm);
        }

    },
    

    // ONLOAD EVENT
    onload: function(frm) {
        hand(frm);
        fetch_tax_records(frm);
    },

    // WORKFLOW STATE CHANGE
    on_workflow_state_change: function(frm) {
        if (frm.doc.workflow_state === 'Vetted') {
            process_deferred_taxes(frm);
            notify_payment_deadlines(frm);
        }
    },

    // FIELD DEPENDENT LOGIC
    mode_of_transport: function(frm) {
        set_brv_filters(frm);
    },
    brv: function(frm) {
        update_truck_volumes(frm);
    },
    distance: calculate_total_internal_transport_cost,
    fuel_price_rate: calculate_total_internal_transport_cost,
    lkm: calculate_total_internal_transport_cost,
    buy_price: calculate_total_fuel_supply_cost,
    nominal_volume_l: calculate_total_fuel_supply_cost,
    total_cost: calculate_grand_cost,
    transportation_cost: calculate_grand_cost,
    total_taxes_and_charges: calculate_grand_cost,
    supplier_quotation: fetch_supplier_quotation,

    // VALIDATION
    validate: function(frm) {
        validate_truck_volume(frm);
        calculate_all_totals(frm);
    },

    // TAX EVENTS
    tax_add: calculate_all_totals,
    tax_remove: calculate_all_totals,
    tax: calculate_all_totals,
    buy_price:calculate_all_totals,
    nominal_volume_l: calculate_all_totals,

});

// HANDLE BUTTONS
function hand(frm) {
    // Add buttons only in the "Vetted" state and when status is not "Paid"
   
}

// CALCULATIONS
function calculate_total_internal_transport_cost(frm) {
    const { distance = 0, fuel_price_rate = 0, lkm = 0 } = frm.doc;
    frm.set_value('transportation_cost', distance * fuel_price_rate * lkm);
}

function calculate_total_fuel_supply_cost(frm) {
    const { nominal_volume_l = 0, buy_price = 0 } = frm.doc;
    frm.set_value('total_cost', nominal_volume_l * buy_price);
}

function calculate_grand_cost(frm) {
    const { total_cost = 0, transportation_cost = 0, total_taxes_and_charges = 0 } = frm.doc;
    frm.set_value('grand_total', total_cost + transportation_cost + total_taxes_and_charges);
}

function calculate_all_totals(frm) {
    const total_cost = frm.doc.total_cost || 0;
    let total_tax = 0;

    (frm.doc.tax || []).forEach(row => {
        row.amount = (row.tax_rate / 100) * total_cost;
        row.total = total_cost + row.amount;
        total_tax += row.amount;
    });

    frm.set_value('total_taxes_and_charges', total_tax);
    frm.refresh_field('tax');
    calculate_grand_cost(frm);
}

function validate_truck_volume(frm) {
    const nominalVolume = frm.doc.nominal_volume_l || 0;
    let selectedVolumeTotal = 0;

    // Calculate total volume selected in "table_mxlk"
    (frm.doc.table_mxlk || []).forEach(row => {
        if (row.volume_l) {
            selectedVolumeTotal += parseInt(row.volume_l, 10); // Ensure proper integer addition
        }
    });

    // Validate if selected volume matches the truck capacity
    if (selectedVolumeTotal !== nominalVolume) {
        frappe.throw(__(`The total selected volume (${selectedVolumeTotal} L) does not match the truck's capacity (${nominalVolume} L). Adjust the volumes.`));
    }
}

// TAX AND NOTIFICATIONS
function fetch_tax_records(frm) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Statutory Fuel Tax',
            filters: { tax_purpose: 'Fuel Purchase' },
            fields: ['tax_name', 'tax_type', 'rate', 'account', 'cost_center']
        },
        callback: function(response) {
            if (response.message) {
                frm.clear_table('tax');
                response.message.forEach(tax => frm.add_child('tax', { ...tax, tax_rate: tax.rate }));
                frm.refresh_field('tax');
            } else {
                frappe.msgprint(__('No tax records found for "Fuel Purchase".'));
            }
        }
    });
}

function process_deferred_taxes(frm) {
    frm.doc.tax.forEach(tax => {
        frappe.call({
            method: "frappe.client.insert",
            args: {
                doc: {
                    doctype: "Deferred Statutory Payment",
                    ...tax,
                    reference_doc: frm.doc.name
                }
            }
        });
    });
}



// DOCUMENT QUERIES
function set_brv_filters(frm) {
    frm.set_query("brv", () => {
        const type = frm.doc.mode_of_transport === "Internal Transport" ? "Internal" : "External";
        return { filters: { type } };
    });
}

function update_truck_volumes(frm) {
    if (!frm.doc.brv) {
        frappe.throw("Select BRV first");
        return;
    }
    frappe.call({
        method: "omc.fuel_ordering.doctype.fuel_lifting_request.fuel_lifting_request.truckdetails",
        args: { truckid: frm.doc.brv },
        callback: function(r) {
            const values = Object.values(r.message).map(v => parseInt(v, 10));
            const combinations = get_combinations(values);
            frm.fields_dict.table_mxlk.grid.update_docfield_property("volume_l", "options", combinations);
            frm.refresh_field('table_mxlk');
        }
    });
}

function get_combinations(values) {
    const result = new Set();
    function find_combinations(index, sum) {
        if (index === values.length) {
            if (sum > 0) result.add(sum);
            return;
        }
        find_combinations(index + 1, sum + values[index]);
        find_combinations(index + 1, sum);
    }
    find_combinations(0, 0);
    return Array.from(result).sort((a, b) => a - b);
}

function fetch_supplier_quotation(frm) {
    if (!frm.doc.supplier_quotation) return;

    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Supplier Quotation',
            name: frm.doc.supplier_quotation
        },
        callback: function(r) {
            if (r.message) {
                const { supplier, grand_total, items } = r.message;
                frm.set_value('bdc', supplier);
                frm.set_value('total_cost', grand_total);
                if (items && items.length > 0) {
                    frm.set_value('fuel_type', items[0].item_code);
                    frm.set_value('buy_price', items[0].rate);
                }
            }
        }
    });
}

// DOCUMENT CREATION
function create_payment_entry(frm, purpose) {
    frappe.new_doc("Payment Entry", {}, fetp => {
        fetp.payment_type = 'Pay',
        fetp.party_type = 'Supplier',
        fetp.party = frm.doc.transporter, 
        fetp.paid_amount = frm.doc.transportation_cost
    });
}

//helper function to fetch stock and sales trends into trends table
function create_purchase_invoice(frm) {
    frappe.new_doc("Purchase Invoice", {
        supplier: frm.doc.bdc,
        bill_date: frappe.datetime.now_date(),
        due_date: frappe.datetime.add_days(frappe.datetime.now_date(), 30),
        custom_reference_document: "Fuel Lifting Request",
        custom_doc: frm.doc.name,
        total: frm.doc.total_cost
    }, pi => {
        const item = frappe.model.add_child(pi, 'items');
        item.item_code = frm.doc.product;
        item.qty = frm.doc.nominal_volume_l;
        item.rate = frm.doc.buy_price;
        item.amount = frm.doc.total_cost;
        frappe.set_route('Form', 'Purchase Invoice', pi.name);
    });
}

// function render_fuel_data_table(frm) {
//     if (!frm.doc.fuel_type) {
//         frappe.msgprint(__('Please select a product to view trends.'));
//         return;
//     }

//     frappe.call({
//         method: "omc.fuel_ordering.doctype.fuel_lifting_request.fuel_lifting_request.fetch_fuel_data",
//         args: { product: "AGO" },
//         callback: function(response) {
//             console.log("API Response:", response.message);
//         }
//     });

//     console.log("Selected Product:", frm.doc.fuel_type);
//     frappe.call({
//         method: "omc.fuel_ordering.doctype.fuel_lifting_request.fuel_lifting_request.fetch_fuel_data",
//         args: { product: frm.doc.fuel_type },
//         callback: function (response) {
//             if (!response || response.length === 0) {
//                 frappe.msgprint(__('No data found for the selected product.'));
//                 frm.clear_table("trends");
//                 frm.refresh_field("trends");
//                 return;
//             }

//             // Clear the child table before populating
//             frm.clear_table("trends");

//             // Populate the trends child table
//             response.forEach(row => {
//                 let child = frm.add_child("trends");
//                 child.outlet = row.outlet;
//                 child.average_daily_sales_l = row.average_daily_sales_l;
//                 child.current_stock_l = row.current_stock_l;
//                 child.stock_lifespan_days = row.stock_lifespan_days;
//                 child.reorder_level_l = row.reorder_level_l;
//             });

//             frm.refresh_field("trends");
//             frappe.msgprint(__('Trends updated successfully.'));
//         }
//     });
// }




// function render_fuel_data_table(frm) {
//     if (!frm.doc.fuel_type) {
//         frm.set_df_property("fuel_data_table", "options", "<p>Please select a product to view data.</p>");
//         return;
//     }

//     frappe.call({
//         method: "omc.fuel_ordering.doctype.fuel_lifting_request.fuel_lifting_request.fetch_fuel_data",
//         args: { product: frm.doc.fuel_type },
//         callback: function (response) {
//             console.log("Backend response:", response.message); // Debugging output
//             const { oft_data, ads } = response.message;

//             if (!oft_data || oft_data.length === 0) {
//                 frm.set_df_property("fuel_data_table", "options", "<p>No data found for the selected product.</p>");
//                 return;
//             }

//             let table_html = `
//                 <table class="table table-bordered">
//                     <thead>
//                         <tr>
//                             <th>Outlet</th>
//                             <th>Average Daily Sales (L)</th>
//                             <th>Current Stock (L)</th>
//                             <th>Stock Lifespan (Days)</th>
//                             <th>Reorder Level (L)</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//             `;

//             oft_data.forEach(oft => {
//                 const stock_lifespan = ads > 0 ? (oft.current_level / ads).toFixed(2) : "N/A";
//                 table_html += `
//                     <tr>
//                         <td>${oft.outlet}</td>
//                         <td>${ads.toFixed(2)}</td>
//                         <td>${oft.current_level}</td>
//                         <td>${stock_lifespan}</td>
//                         <td>${oft.reorder_level}</td>
//                     </tr>
//                 `;
//             });

//             table_html += `
//                     </tbody>
//                 </table>
//             `;

//             frm.set_df_property("fuel_data_table", "options", table_html);
//         },
//     });
// }





function render_fuel_data_table(frm) {
    if (!frm.doc.fuel_type) {
        frappe.msgprint(__('Please select a product to view trends.'));
        return;
    }

    frappe.call({
        method: "omc.fuel_ordering.doctype.fuel_lifting_request.fuel_lifting_request.fetch_fuel_data",
        args: { product: frm.doc.fuel_type },
        callback: function (response) {
            console.log("API Response:", response.message); // Debug

            const oft_data = response.message;
            if (!oft_data || oft_data.length === 0) {
                frappe.msgprint(__('No data found for the selected product.'));
                return;
            }

            let table_html = `
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Outlet</th>
                            <th>Average Daily Sales (L)</th>
                            <th>Current Stock (L)</th>
                            <th>Stock Lifespan (Days)</th>
                            <th>Reorder Level (L)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            oft_data.forEach(oft => {
                const stock_lifespan = oft.average_daily_sales_l > 0 ? (oft.current_stock_l / oft.average_daily_sales_l).toFixed(2) : "N/A";
                table_html += `
                    <tr>
                        <td>${oft.outlet}</td>
                        <td>${oft.average_daily_sales_l.toFixed(2)}</td>
                        <td>${oft.current_stock_l}</td>
                        <td>${stock_lifespan}</td>
                        <td>${oft.reorder_level_l}</td>
                    </tr>
                `;
            });

            table_html += `
                    </tbody>
                </table>
            `;
            console.log("Generated Table HTML:", table_html); // Debug

            frm.set_df_property("fuel_data_table", "options", table_html);
        },
    });
}