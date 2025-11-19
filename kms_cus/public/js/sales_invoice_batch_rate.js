// ======================================================================
// STOP ERPNext AUTO-BATCH ONLY FOR MANUAL ITEM SELECTION
// ======================================================================
frappe.ui.form.on("Sales Invoice Item", {
    item_code(frm, cdt, cdn) {
        setTimeout(() => {
            let row = frappe.get_doc(cdt, cdn);

            // IF BARCODE SCANNED → KEEP BATCH
            if (row.barcode_scanned == 1) {
                console.log("✔ Barcode scan detected → batch kept:", row.batch_no);
                return;
            }

            // MANUAL item selection → remove ERPNext auto batch
            if (row.batch_no) {
                console.log("❌ Auto batch removed:", row.batch_no);
                frappe.model.set_value(cdt, cdn, "batch_no", "");
            }
        }, 350);
    }
});

// ======================================================================
// ON BATCH SELECTED
// ======================================================================
frappe.ui.form.on('Sales Invoice Item', {
    batch_no(frm, cdt, cdn) {
        set_batch_rate(frm, cdt, cdn, true);
        fetch_lot_no(frm, cdt, cdn);
        check_batch_qty(frm, cdt, cdn);
    },
    qty(frm, cdt, cdn) {
        check_batch_qty(frm, cdt, cdn);
    },
    rate(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        row.manual_rate = 1;
    }
});

// ======================================================================
// SET SELLING PRICE FROM BATCH
// ======================================================================
function set_batch_rate(frm, cdt, cdn, overwrite = false) {
    let row = frappe.get_doc(cdt, cdn);
    if (!row.batch_no) return;

    if (row.manual_rate && !overwrite) return;

    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Batch",
            filters: { name: row.batch_no },
            fieldname: ["custom_selling_price"]
        },
        callback(r) {
            if (r?.message) {
                const price = r.message.custom_selling_price || 0;

                frm._ignore_rate_change = true;
                frappe.model.set_value(cdt, cdn, "rate", price);
                frappe.model.set_value(cdt, cdn, "price_list_rate", price);
                frm._ignore_rate_change = false;

                frappe.model.set_value(cdt, cdn, "manual_rate", 0);
                frm.refresh_field("items");
            }
        }
    });
}

// ======================================================================
// CHECK AVAILABLE BATCH QTY
// ======================================================================
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
        callback(r) {
            if (!r || !r.message) return;

            if (r.message < row.qty) {
                frappe.msgprint({
                    title: "Insufficient Batch Qty",
                    indicator: "red",
                    message: `Available: <b>${r.message}</b><br>Required: <b>${row.qty}</b>`
                });

                frappe.model.set_value(cdt, cdn, "batch_no", "");
            }
        }
    });
}

// ======================================================================
// FETCH LOT NO
// ======================================================================
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
        callback(r) {
            if (r?.message) {
                frappe.model.set_value(cdt, cdn, "custom_lot_no", r.message.custom_lot_no);
                frm.refresh_field("items");
            }
        }
    });
}
