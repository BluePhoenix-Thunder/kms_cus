// ===================================================================
// SALES INVOICE – Inline Manual + Add Button + QR Scan Icon (Camera)
// ===================================================================

// BLOCK DEFAULT BATCH POPUP
setInterval(() => {
    const oldDialog = frappe.ui.Dialog;
    frappe.ui.Dialog = class extends oldDialog {
        constructor(opts) {
            if (opts && opts.title && opts.title.includes("Add Batch Nos")) {
                console.log("Batch popup forcibly blocked");
                return;
            }
            super(opts);
        }
    };
}, 500);

frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        render_inline_barcode_ui(frm);
    }
});

function render_inline_barcode_ui(frm) {
    if (frm.__inline_barcode_rendered) return;
    frm.__inline_barcode_rendered = true;

    // ------------------ CSS ------------------
    const styleId = "inline-barcode-style";
    if (!document.getElementById(styleId)) {
        const css = `
          .barcode-field-wrap {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .barcode-input-box {
            position: relative;
            flex: 1;
            max-width: 320px;
          }
          .barcode-input-box input {
            width: 100%;
            height: 36px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 6px 40px 6px 12px;
            font-size: 13px;
            background: linear-gradient(180deg,#fafbff,#f3f5ff);
          }
          .barcode-icon {
            position: absolute;
            right: 10px;
            top: 7px;
            font-size: 17px;
            color: var(--text-muted);
            cursor: pointer;
          }
        `;
        const el = document.createElement("style");
        el.id = styleId;
        el.innerHTML = css;
        document.head.appendChild(el);
    }

    // ------------------ HTML ------------------
    const $grid = frm.fields_dict.items.grid.wrapper;
    const html = `
        <div class="barcode-field-wrap">
          <div class="barcode-input-box">
            <input type="text" id="barcode_input" placeholder="Enter or scan barcode...">
            <i class="fa fa-qrcode barcode-icon" id="barcode_icon"></i>
          </div>
          <button class="btn btn-primary" id="barcode_add_btn">
            <i class="fa fa-plus"></i> Add
          </button>
        </div>
    `;
    const $ui = $(html);
    $grid.before($ui);

    const $input = $ui.find("#barcode_input");
    const $icon  = $ui.find("#barcode_icon");
    const $btn   = $ui.find("#barcode_add_btn");

    // ENTER PRESS
    $input.on("keydown", async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const code = extract_barcode_value($input.val());
            if (!code) return;
            await process_barcode(frm, code);
            $input.val("").focus();
        }
    });

    // ADD BUTTON
    $btn.on("click", async () => {
        const code = extract_barcode_value($input.val());
        if (!code) {
            frappe.show_alert({ message: "Enter or scan barcode first", indicator: "red" });
            return;
        }
        await process_barcode(frm, code);
        $input.val("").focus();
    });

    // CAMERA SCANNER
    $icon.on("click", async () => {
        if (!(frappe.ui && frappe.ui.Scanner)) {
            frappe.msgprint("Camera scanner unavailable.");
            return;
        }

        const scanner = new frappe.ui.Scanner({
            dialog: true,
            type: "barcode",
            multiple: false,
            on_scan: async (raw) => {
                const code = extract_barcode_value(raw);
                if (code) await process_barcode(frm, code);
            }
        });

        if (scanner.make) scanner.make();
        else if (scanner.open) scanner.open();
        else if (scanner.dialog?.show) scanner.dialog.show();
    });
}

// ===================================================================
// MAIN BARCODE PROCESSING LOGIC
// ===================================================================
async function process_barcode(frm, code) {
    if (!code) return;

    const batch = await get_batch_by_barcode(code);
    if (!batch) {
        frappe.msgprint({
            title: "Barcode Not Found",
            indicator: "red",
            message: `No Batch found with barcode <b>${code}</b>`
        });
        return;
    }

    // Remove default blank row
    if (frm.doc.items?.length === 1) {
        const only = frm.doc.items[0];
        if (!only.item_code && !only.qty && !only.batch_no) {
            frm.doc.items = [];
            frm.refresh_field("items");
        }
    }

    // IF SAME BATCH EXISTS → increase qty
    const existing = frm.doc.items?.find(r => r.batch_no === batch.name);
    if (existing) {
        frappe.model.set_value(existing.doctype, existing.name, "barcode_scanned", 1);
        frappe.model.set_value(existing.doctype, existing.name, "qty", (existing.qty || 0) + 1);
        frm.refresh_field("items");
        return;
    }

    // NEW ROW
    try {
        frm.script_manager.ignore_doctypes_on_trigger = ["Sales Invoice Item"];

        const row = frm.add_child("items");

        // IMPORTANT → Prevent batch clearing
        await frappe.model.set_value(row.doctype, row.name, "barcode_scanned", 1);

        await frappe.model.set_value(row.doctype, row.name, "item_code", batch.item);
        await frappe.model.set_value(row.doctype, row.name, "batch_no", batch.name);
        await frappe.model.set_value(row.doctype, row.name, "custom_lot_no", batch.custom_lot_no);
        await frappe.model.set_value(row.doctype, row.name, "rate", batch.custom_selling_price);
        await frappe.model.set_value(row.doctype, row.name, "price_list_rate", batch.custom_selling_price);
        await frappe.model.set_value(row.doctype, row.name, "qty", 1);

    } finally {
        delete frm.script_manager.ignore_doctypes_on_trigger;
    }

    frm.refresh_field("items");
}

// ===================================================================
// HELPERS
// ===================================================================
function extract_barcode_value(raw) {
    let v = (raw || "").trim();
    return v.replace(/[^0-9A-Za-z]/g, "");
}

async function get_batch_by_barcode(code) {
    return new Promise(resolve => {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Batch",
                filters: { custom_barcode: code },
                fields: ["name", "item", "custom_lot_no", "custom_selling_price"],
                limit_page_length: 1
            },
            callback: r => resolve(r.message?.[0] || null)
        });
    });
}
