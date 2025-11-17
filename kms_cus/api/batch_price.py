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
# MAIN FUNCTION – ON PURCHASE RECEIPT SUBMIT
# ---------------------------------------------------------
def update_batch_price(doc, method):
    """
    Called from Purchase Receipt hooks.
    Allows manual selling price entry for batch (separate from purchase rate).
    """

    for item in doc.items:
        if not item.batch_no:
            continue

        batch_no = item.batch_no
        item_code = item.item_code
        purchase_rate = item.rate

        # Fetch manually entered selling price from Batch
        custom_selling_price = frappe.db.get_value("Batch", batch_no, "custom_selling_price")

        # If user didn’t enter, default to purchase rate
        selling_price = custom_selling_price or purchase_rate

        # Store selling price in Batch
        frappe.db.set_value("Batch", batch_no, "custom_selling_price", selling_price)

        # Create or update Item Prices
        create_buying_price(item_code, purchase_rate, batch_no)
        create_global_selling_price(item_code, selling_price, batch_no)

        # Ensure barcode exists
        existing_barcode = frappe.db.get_value("Batch", batch_no, "custom_barcode")
        if not existing_barcode:
            ean13_code = generate_ean13_code(prefix="890")
            frappe.db.set_value("Batch", batch_no, "custom_barcode", ean13_code)


# ---------------------------------------------------------
# CREATE BUYING PRICE ENTRY
# ---------------------------------------------------------
def create_buying_price(item_code, rate, batch_no):
    existing = frappe.db.exists("Item Price", {
        "item_code": item_code,
        "price_list": "Standard Buying",
        "batch_no": batch_no
    })
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
    existing = frappe.db.exists("Item Price", {
        "item_code": item_code,
        "price_list": "Standard Selling",
        "batch_no": batch_no,
        "customer": ["is", "not set"]
    })
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
