import frappe
import random

# ---------------------------------------------------------
# HELPER: Generate valid EAN-13 code
# ---------------------------------------------------------
def generate_ean13_code(prefix="890"):
    base = prefix + "".join(str(random.randint(0, 9)) for _ in range(12 - len(prefix)))
    total = sum((3 if i % 2 else 1) * int(num) for i, num in enumerate(base[::-1]))
    check_digit = (10 - (total % 10)) % 10
    return base + str(check_digit)


# ---------------------------------------------------------
# PURCHASE RECEIPT SUBMIT
# ONLY CREATE STANDARD BUYING PRICE
# ---------------------------------------------------------
def update_batch_price(doc, method):
    """
    On Purchase Receipt submit:
    ✔ Save custom selling price into Batch
    ✔ Create Standard Buying Item Price
    ❌ DO NOT create Standard Selling Item Price
    ✔ Generate barcode if missing
    """

    for item in doc.items:
        if not item.batch_no:
            continue

        batch_no = item.batch_no
        item_code = item.item_code
        purchase_rate = item.rate

        # Fetch manual selling price from Batch
        custom_selling_price = frappe.db.get_value("Batch", batch_no, "custom_selling_price")

        # If empty, default to purchase rate
        selling_price = custom_selling_price or purchase_rate

        # Save selling price in Batch (not Item Price)
        frappe.db.set_value("Batch", batch_no, "custom_selling_price", selling_price)

        # CREATE ONLY BUYING PRICE
        create_buying_price(item_code, purchase_rate, batch_no)

        # NO SELLING PRICE CREATION HERE

        # Barcode generation
        existing_barcode = frappe.db.get_value("Batch", batch_no, "custom_barcode")
        if not existing_barcode:
            ean13_code = generate_ean13_code(prefix="890")
            frappe.db.set_value("Batch", batch_no, "custom_barcode", ean13_code)


# ---------------------------------------------------------
# SALES INVOICE SUBMIT
# CREATE STANDARD SELLING PRICE
# ---------------------------------------------------------
def create_selling_price_from_sales_invoice(doc, method):
    """
    On Sales Invoice submit:
    ✔ For each batch in invoice, read Batch.custom_selling_price
    ✔ Create Standard Selling Item Price
    """
    for item in doc.items:
        if not item.batch_no:
            continue

        batch_no = item.batch_no
        item_code = item.item_code

        selling_price = frappe.db.get_value("Batch", batch_no, "custom_selling_price") or 0

        # Create / update Standard Selling price
        create_global_selling_price(item_code, selling_price, batch_no)


# ---------------------------------------------------------
# AUTO-GENERATE BARCODE FOR STOCK RECONCILIATION (OPENING STOCK)
# ---------------------------------------------------------
def generate_barcode_for_stock_reconciliation(doc, method):
    for item in doc.items:
        if not item.batch_no:
            continue

        batch_no = item.batch_no

        existing = frappe.db.get_value("Batch", batch_no, "custom_barcode")
        if existing:
            continue

        ean13_code = generate_ean13_code(prefix="890")
        frappe.db.set_value("Batch", batch_no, "custom_barcode", ean13_code)


# ---------------------------------------------------------
# CREATE BUYING PRICE ENTRY
# ---------------------------------------------------------
def create_buying_price(item_code, rate, batch_no):
    existing = frappe.db.exists(
        "Item Price",
        {
            "item_code": item_code,
            "price_list": "Standard Buying",
            "batch_no": batch_no
        }
    )
    if existing:
        frappe.db.set_value("Item Price", existing, "price_list_rate", rate)
    else:
        doc = frappe.get_doc({
            "doctype": "Item Price",
            "price_list": "Standard Buying",
            "item_code": item_code,
            "price_list_rate": rate,
            "batch_no": batch_no
        })
        doc.insert(ignore_permissions=True)


# ---------------------------------------------------------
# CREATE SELLING PRICE ENTRY
# ---------------------------------------------------------
def create_global_selling_price(item_code, rate, batch_no):
    existing = frappe.db.exists(
        "Item Price",
        {
            "item_code": item_code,
            "price_list": "Standard Selling",
            "batch_no": batch_no,
            "customer": ["is", "not set"]
        }
    )
    if existing:
        frappe.db.set_value("Item Price", existing, "price_list_rate", rate)
    else:
        doc = frappe.get_doc({
            "doctype": "Item Price",
            "price_list": "Standard Selling",
            "item_code": item_code,
            "price_list_rate": rate,
            "batch_no": batch_no
        })
        doc.insert(ignore_permissions=True)
