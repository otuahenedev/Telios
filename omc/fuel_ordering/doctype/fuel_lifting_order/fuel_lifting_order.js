// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Fuel Lifting Order", {
// 	refresh(frm) {

// 	},
// });



frappe.ui.form.on("Request Fuel Details", {
    table_mxlk_add(frm, cdt, cdn){
                       
}
});

frappe.ui.form.on("Fuel Lifting Order", {
    fuel_type: function(frm) {
        let fuel_type = frm.doc.fuel_type;

        // Check if the fuel type is AGO
        if (fuel_type == 'AGO') {
            frappe.call({
                method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.justification",
                args: { fuel_type: fuel_type }
            }).done((r) => {
                frm.doc.just = [];
                $.each(r.message, function(_i, e) {
                    let justice = frm.add_child("just");
                    justice.outlet = e.FuelStation;
                    justice.avg_daily_sales = e.AverageDailyDieselSales;
                    justice.current_stock_level = e.CurrentDieselStock;
                    justice.stock_lifespan = e.DieselStockLifespan;
                    justice.reorder_level = e.ReorderLevelDiesel;
                });
                refresh_field("just");

                // Call function to render table for AGO
                render_fuel_data_table(frm, "just", "Diesel Justification Data");
            });
        } else if (fuel_type) {  // If the fuel type is anything else
            frappe.call({
                method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.justification",
                args: { fuel_type: fuel_type }
            }).done((r) => {
                frm.doc.justp = [];
                $.each(r.message, function(_i, j) {
                    let justiced = frm.add_child("justp");
                    justiced.outlet = j.FuelStation;
                    justiced.avg_daily_sales = j.AverageDailyPetrolSales;
                    justiced.current_stock_level = j.CurrentPetrolStock;
                    justiced.stock_lifespan = j.PetrolStockLifespan;
                    justiced.reorder_level = j.ReorderLevelPetrol;
                });
                refresh_field("justp");

                // Call function to render table for Petrol
                render_fuel_data_table(frm, "justp", "Petrol Justification Data");
            });
        }
    }
});

// Helper function to render HTML table in the HTML field
function render_fuel_data_table(frm, child_table_name, title) {
    let table_content = `
        <h4>${title}</h4>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Outlet</th>
                    <th>Average Daily Sales</th>
                    <th>Current Stock Level</th>
                    <th>Stock Lifespan</th>
                    <th>Reorder Level</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Loop through each row in the specified child table
    (frm.doc[child_table_name] || []).forEach(row => {
        table_content += `
            <tr>
                <td>${row.outlet || ""}</td>
                <td>${row.avg_daily_sales || ""}</td>
                <td>${row.current_stock_level || ""}</td>
                <td>${row.stock_lifespan || ""}</td>
                <td>${row.reorder_level || ""}</td>
            </tr>
        `;
    });

    table_content += `
            </tbody>
        </table>
    `;

    // Set the HTML content to the HTML field
    frm.set_df_property("fuel_data_table", "options", table_content);
}

frappe.ui.form.on('Fuel Lifting Order', {
    

    /*validate: function(frm){
        total = 0; 
		tank_volume = frm.doc.nominal_volume_l;
		frm.doc.table_mxlk.forEach(function(d) { total += d.volume_l; });
        if (total == tank_volume){
            frappe.validated = true; 
            console.log(total,tank_volume);
         
        }
        else{
            frappe.throw(__('Total Volume Listed for Outlets Must Be Equal to the Total Capacity of the Fuel Truck Selected.  '))
            frappe.validated = false;
        }
    },/*

    */
   

    refresh: function(frm) {
        if ((frm.doc.workflow_state === 'Vetted') && (frappe.user.has_role('Account User'))) {
        
            // Button to create Purchase Invoice for Supplier
            frm.add_custom_button(__('Purchase Invoice (Supplier)'), () => {
                frappe.new_doc("Purchase Invoice", {
                    supplier: frm.doc.bdc,
                    items: [
                        {
                            item_name: frm.doc.product,
                            qty: frm.doc.nominal_volume_l,
                            rate: frm.doc.buy_price,
                            amount: frm.doc.total_cost
                        }
                    ],
                    taxes_and_charges: frm.doc.immidiate_taxes.map(tax => ({
                        charge_type: 'Actual',
                        rate: tax.tax_rate,
                        category: 'Total',

                        account_head: tax.account,
                        cost_center: tax.cost_center,
                        tax_amount: tax.amount
                    }))
                });
            }, __('Create'));
    
            // Button to create Purchase Invoice for Transport
            frm.add_custom_button(__('Purchase Invoice (Transport)'), () => {
                frappe.new_doc("Purchase Invoice", {
                    supplier: frm.doc.transporter,
                    items: [
                        {
                            item_name: 'Transportation Cost',
                            qty: 1,
                            rate: frm.doc.transportation_cost,
                            amount: frm.doc.transportation_cost
                        }
                    ]
                });
            }, __('Create'));
        }

        
        calculate_totals(frm);

        
        /*if((frm.doc.docstatus == 1 ) && (frappe.user.has_role('Accounts User'))) {
            frm.add_custom_button("Create Payment Entry ", () => {
               // frappe.msgprint("clicked")
               frappe.new_doc("Payment Entry",{}, fdp => {
                fdp.custom_reference_link = frm.doc.name;
                fdp.payment_type = "Receive"
                fdp.party_type = "Supplier"
                fdp.party = frm.doc.bdc
                fdp.paid_amount = frm.doc.total_cost
                
                
                
               });
            }).css({'background-color':'#f8c516','color':'black','font-weight': 'bold'});;
        }*/
       
    },

    supplier_quotation: function(frm) {
        if (frm.doc.supplier_quotation) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Supplier Quotation',
                    name: frm.doc.supplier_quotation
                },
                callback: function(r) {
                    if (r.message) {
                        // Fetch supplier and grand total
                        frm.set_value('bdc', r.message.supplier);
                        frm.set_value('total_cost', r.message.grand_total);

                        // Fetch item_code and rate from the child table
                        if (r.message.items && r.message.items.length > 0) {
                            // Assuming you want to fetch the first item's details
                            let item = r.message.items[0];
                            frm.set_value('fuel_type', item.item_code);
                            frm.set_value('buy_price', item.rate);
                        }
                    }
                }
            });
        }
    },

    before_workflow_action: async (frm) => {
    	let promise = new Promise((resolve, reject) => {
            frappe.dom.unfreeze()
    		frappe.confirm(
    		"<b>Are all fields correctly entered ? Please review the information carefully.</b>",
    		() => resolve(),
    		() => reject() 
    		);
    
    	});
    	await promise.catch(() => frappe.throw());
    },

    mode_of_transport: function(frm) {
        if (frm.doc.mode_of_transport === "Internal Transport") {
            frm.set_query("brv", function() {
                return {
                    filters: {
                        type: "Internal"
                    }
                };
            });
        } else if (frm.doc.mode_of_transport === "External Transport") {
            frm.set_query("brv", function() {
                return {
                    filters: {
                        type: "External"
                    }
                };
            });
        } else {
            frm.set_query("brv", function() {
                return {};
            });
        }
    },
    brv: function(frm) {
        let truckid = frm.doc.brv;
        if (truckid) {
            frappe.call({
                method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.truckdetails",
                args: { truckid: truckid }
            }).done((r) => {
                const mrss = r.message;

                // Function to calculate all unique sums of compartment volumes
                function listAndSumPairs(values) {
                    let result = new Set();

                    function findCombinations(currentIndex, currentSum) {
                        if (currentIndex === values.length) {
                            if (currentSum > 0) result.add(currentSum); // Add to result if not zero
                            return;
                        }

                        // Include the current compartment in the sum
                        findCombinations(currentIndex + 1, currentSum + values[currentIndex]);

                        // Exclude the current compartment from the sum
                        findCombinations(currentIndex + 1, currentSum);
                    }

                    findCombinations(0, 0);
                    return Array.from(result).sort((a, b) => a - b);
                }

                // Convert mrss object values to integers and pass to listAndSumPairs
                let values = Object.values(mrss).map(v => parseInt(v, 10));
                let result = listAndSumPairs(values);

                // Update the "volume_l" field options in the "table_mxlk" child table
                frm.fields_dict.table_mxlk.grid.update_docfield_property("volume_l", "options", result);
                frm.refresh_field('table_mxlk');
            });
        } else {
            frappe.throw("Select BRV first");
        }
    },

    buy_price: function(frm) {
        calculate_total_fuelsupply_cost(frm);
    },
    nominal_volume_l: function(frm) {
        calculate_total_fuelsupply_cost(frm);
    },
    total_cost: function(frm) {
        calculate_grand_cost(frm);
    },
    transportation_cost: function(frm) {
        calculate_grand_cost(frm);
    },
    total_taxes_and_charges: function(frm) {
        calculate_grand_cost(frm);
    },
    total_cost: function(frm) {
        calculate_totals(frm);
    },
    deferred_taxes_add: function(frm) {
        calculate_totals(frm);
    },
    deferred_taxes_remove: function(frm) {
        calculate_totals(frm);
    },
    immediate_taxes_add: function(frm) {
        calculate_totals(frm);
    },
    immediate_taxes_remove: function(frm) {
        calculate_totals(frm);
    },
    immediate_taxes: function(frm) {
        calculate_totals(frm);
    },
    deferred_taxes: function(frm) {
        calculate_totals(frm);
    },
    transportation_cost: function(frm) {
        calculate_totals(frm);
    },

    // validate if distribution points volume selected = voulume of fuel truck
    validate: function(frm) {
        let selectedVolumeTotal = 0;
        let nominalVolume = frm.doc.nominal_volume_l;

        // Calculate total volume selected in "table_mxlk"
        $.each(frm.doc.table_mxlk || [], function(_, row) {
            if (row.volume_l) {
                selectedVolumeTotal += parseInt(row.volume_l, 10);
            }
        });

        // Validate if selected volume matches the truck capacity
        if (selectedVolumeTotal !== nominalVolume) {
            frappe.throw(
                __("The total selected volume ({0} L) does not match the truck's capacity ({1} L). Please adjust the volumes in the table.", [selectedVolumeTotal, nominalVolume])
            );
        }
        calculate_totals(frm);

    }


   
});


function calculate_total_fuelsupply_cost(frm) {
    let qty = frm.doc.nominal_volume_l || 0 ;
    let price = frm.doc.buy_price || 0;
    frm.set_value('total_cost', qty * price )
}

function calculate_grand_cost(frm){
    let sc = frm.doc.total_cost || 0
    let tc = frm.doc.transportation_cost || 0
    let ttc = frm.doc.total_taxes_and_charges || 0
  //  let tdt = frm.doc.total_deferred_taxes || 0
    frm.set_value('grand_total', sc + tc + ttc )
   // frm.set_value('grand_total', sc + tc + ttc )

}

function calculate_totals(frm) {
    let total_cost = frm.doc.total_cost || 0;
    let total_deferred_taxes = 0;
    let total_immediate_taxes = 0;

    // Calculate total for deferred_taxes
    frm.doc.deferred_taxes.forEach(function(row) {
        row.amount = (row.tax_rate / 100) * total_cost;
        row.total = row.amount + total_cost;
        total_deferred_taxes += row.amount;
    });

    // Calculate total for immediate_taxes
    frm.doc.immediate_taxes.forEach(function(row) {
        row.amount = (row.tax_rate / 100) * total_cost;
        row.total = row.amount + total_cost;
        total_immediate_taxes += row.amount;
    });

    // Set the totals in the parent fields
    frm.set_value('total_deferred_taxes', total_deferred_taxes);
    frm.set_value('total_immediate_taxes', total_immediate_taxes);

    // Calculate total taxes and charges
    let total_taxes_and_charges = total_deferred_taxes + total_immediate_taxes;
    frm.set_value('total_taxes_and_charges', total_taxes_and_charges);

    // Refresh the fields in the child tables
    frm.refresh_field('deferred_taxes');
    frm.refresh_field('immediate_taxes');
}






