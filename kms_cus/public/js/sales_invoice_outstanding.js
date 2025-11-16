frappe.ui.form.on('Sales Invoice', {
    customer: function(frm) {
        if (frm.doc.customer) {
            frappe.call({
                method: "kms_cus.overrides.sales_invoice_outstanding.get_customer_previous_outstanding",
                args: {
                    customer: frm.doc.customer,
                    company: frm.doc.company
                },
                callback: function(r) {
                    if (r.message !== undefined) {
                        frm.set_value("custom_customer_previous_outstanding", r.message || 0);
                        frm.refresh_field("custom_customer_previous_outstanding");
                        frappe.show_alert({
                            message: `Previous Outstanding: ₹${(r.message || 0).toLocaleString()}`,
                            indicator: 'orange'
                        }, 4);
                    }
                }
            });
        } else {
            frm.set_value("custom_customer_previous_outstanding", 0);
            frm.refresh_field("custom_customer_previous_outstanding");
        }
    }
});
