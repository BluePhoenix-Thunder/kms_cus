// ======================================================
// SALES INVOICE ITEM EVENTS
// ======================================================
frappe.ui.form.on('Sales Invoice Item', {
    batch_no(frm, cdt, cdn) {
        set_batch_rate(frm, cdt, cdn, true);   // autofill only once
        fetch_lot_no(frm, cdt, cdn);           // autofill lot number
        check_batch_qty(frm, cdt, cdn);        // block insufficient qty
    },
    qty(frm, cdt, cdn) {
        check_batch_qty(frm, cdt, cdn);        // recheck qty
    },
    rate(frm, cdt, cdn) {
        // Allow manual override but remember that user has changed manually
        let row = frappe.get_doc(cdt, cdn);
        row.manual_rate = 1; // mark as manually changed
    }
});


// ======================================================
// SET RATE FROM Batch.custom_selling_price (Auto-fill once)
// ======================================================
function set_batch_rate(frm, cdt, cdn, overwrite = false) {
    let row = frappe.get_doc(cdt, cdn);
    if (!row.batch_no) return;

    // Skip setting rate if user already entered manually
    if (row.manual_rate && !overwrite) return;

    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Batch",
            filters: { name: row.batch_no },
            fieldname: ["custom_selling_price"]
        },
        callback: function(r) {
            if (r && r.message) {
                let price = r.message.custom_selling_price || 0;

                frm._ignore_rate_change = true;
                frappe.model.set_value(cdt, cdn, "rate", price);
                frappe.model.set_value(cdt, cdn, "price_list_rate", price);
                frm._ignore_rate_change = false;

                // Reset manual flag after auto-fill
                frappe.model.set_value(cdt, cdn, "manual_rate", 0);

                frm.refresh_field("items");
            }
        }
    });
}


// ======================================================
// BLOCK BATCH IF STOCK QTY IS INSUFFICIENT
// ======================================================
function check_batch_qty(frm, cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);

    if (!row.batch_no || !row.item_code || !row.warehouse) return;

    frappe.call({
        method: "erpnext.stock.doctype.batch.batch.get_batch_qty",
        args: {
            batch_no: row.batch_no,
            item_code: row.item_code,
            warehouse: row.warehouse
        },
        callback: function(r) {
            if (!r || !r.message) return;

            let available_qty = r.message;

            if (available_qty < row.qty) {
                frappe.msgprint({
                    title: "Insufficient Batch Quantity",
                    indicator: "red",
                    message: `
                        <b>Available Qty:</b> ${available_qty}<br>
                        <b>Required Qty:</b> ${row.qty}<br><br>
                        This batch does not have enough stock. Please choose another batch.
                    `
                });
                frappe.model.set_value(cdt, cdn, "batch_no", "");
            }
        }
    });
}


// ======================================================
// AUTO-FETCH Batch.custom_lot_no INTO Sales Invoice Item
// ======================================================
function fetch_lot_no(frm, cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);

    if (!row.batch_no) return;

    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Batch",
            filters: { name: row.batch_no },
            fieldname: "custom_lot_no"
        },
        callback: function(r) {
            if (r && r.message) {
                frappe.model.set_value(
                    cdt,
                    cdn,
                    "custom_lot_no",
                    r.message.custom_lot_no
                );
                frm.refresh_field("items");
            }
        }
    });
}
