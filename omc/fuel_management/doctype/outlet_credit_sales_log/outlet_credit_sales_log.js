// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

frappe.ui.form.on("Outlet Credit Sales Log", {
    outlet: function(frm) {
        console.log('test')
        update_product_pricing(frm);
    },
    volume_sold_l: function(frm) {
        calculate_total_sales(frm);
    },
    product: function(frm) {
        calculate_total_sales(frm);
    }
});

// Helper function to update product pricing based on selected outlet
function update_product_pricing(frm) {
    const outlet = frm.doc.outlet;
    if (!outlet) {
        frappe.msgprint(__('Please select an Outlet.'));
        return;
    }

    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Customer",
            name: outlet,
        },
        callback: function(response) {
            const customer = response.message;

            if (customer && customer.custom_product_rates) {
                frm.clear_table("product_pricing");
                
                // Populate 'product_pricing' table with data
                customer.custom_product_rates.forEach(product => {
                    const child = frm.add_child("product_pricing");
                    child.product = product.product;
                    child.rate = product.rate;
                });
                frm.refresh_field("product_pricing"); // Apply changes
            } else {
                frappe.msgprint(__('No products found for the selected Outlet.'));
            }
        },
        error: function() {
            frappe.msgprint(__('Failed to fetch Outlet data.'));
        }
    });
}

// Helper function to calculate and set the total sales
function calculate_total_sales(frm) {
    if (!frm.doc.product || !frm.doc.volume_sold_l) {
        frm.set_value('sales_ghs', 0); // Reset sales if required fields are missing
        frappe.msgprint(__('Please select a product and enter the volume sold.'));
        return;
    }

    // Search for the product in the 'product_pricing' child table
    const productRow = frm.doc.product_pricing.find(row => row.product === frm.doc.product);

    if (productRow) {
        const rate = productRow.rate || 0;
        const total_sales = frm.doc.volume_sold_l * rate;
        
        // Update 'sales_ghs' in the parent doctype
        frm.set_value('sales_ghs', total_sales);
    } else {
        frappe.msgprint(__('Product {0} not found in the pricing table.', [frm.doc.product]));
        frm.set_value('sales_ghs', 0); // Reset sales if product is not found
    }
}