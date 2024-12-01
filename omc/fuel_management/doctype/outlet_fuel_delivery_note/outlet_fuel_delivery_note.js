// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

frappe.ui.form.on("Outlet Fuel Delivery Note", {
    outlet(frm) {
        if (frm.doc.fuel_type && frm.doc.outlet) {
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Customer",
                    name: frm.doc.outlet, // Use frm.doc.outlet
                },
                callback: function (response) {
                    let customer = response.message;
                    if (customer && customer.custom_product_rates) {
                        let found = false;
                        customer.custom_product_rates.forEach(price => {
                            if (price.product == frm.doc.fuel_type) {
                                frm.set_value("product_price_rate", price.rate);
                                found = true;
                            }
                        });

                        if (!found) {
                            frm.set_value("product_price_rate", 45);
                            frappe.msgprint(__('No rate found for the selected product.'));
                        }

                        // Calculate product value after setting product_price_rate
                        let ppr = frm.doc.product_price_rate || 0;
                        let efl = frm.doc.volume_received_l || 0;
                        let value_of_product = ppr * efl;
                        frm.set_value("product_value", value_of_product);
                        console.log("Product Value:", value_of_product, ppr, efl);
                    }
                }
            });
        }
    }
});