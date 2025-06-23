# Copyright (c) 2025, Blue Phoenix and contributors
# For license information, please see license.txt

import frappe


# def execute(filters=None):
# 	columns, data = [], []
# 	return columns, data

def execute(filters=None):
    columns = [
        {
            "label": "Item Code",
            "fieldname": "item_code",
            "fieldtype": "Data",
        },
        {
            "label": "Item Name",
            "fieldname": "item_name",
            "fieldtype": "Data",
        },
        {
            "label": "Item Group",
            "fieldname": "item_group",
            "fieldtype": "Data",
        },
        {
            "label": "Description",
            "fieldname": "description",
            "fieldtype": "Data",
        },
        {
            "label": "Quantity",
            "fieldname": "qty",
            "fieldtype": "Float",
        },
        {
            "label": "UOM",
            "fieldname": "uom",
            "fieldtype": "Data",
        },
        {
            "label": "Rate",
            "fieldname": "rate",
            "fieldtype": "Currency",
        },
        {
            "label": "Amount",
            "fieldname": "amount",
            "fieldtype": "Currency",
        },
        {
            "label": "Purchase Order",
            "fieldname": "purchase_order",
            "fieldtype": "Link",
            "options": "Purchase Order",
        },
        {
            "label": "Transaction Date",
            "fieldname": "transaction_date",
            "fieldtype": "Date",
        },
        {
            "label": "Supplier",
            "fieldname": "supplier",
            "fieldtype": "Link",
            "options": "Supplier",
        },
        {
            "label": "Supplier Name",
            "fieldname": "supplier_name",
            "fieldtype": "Data",
        },
        {
            "label": "Project",
            "fieldname": "project",
            "fieldtype": "Link",
            "options": "Project",
        },
        {
            "label": "Transporter Name",
            "fieldname": "transporter_name",
            "fieldtype": "Data",
        },
        {
            "label": "Vehicle Number",
            "fieldname": "lr_no",
            "fieldtype": "Data",
        },
        {
            "label": "Vehicle Date",
            "fieldname": "lr_date",
            "fieldtype": "Date",
        },
        {
            "label": "LR No.",
            "fieldname": "custom_lr_no_1",
            "fieldtype": "Data",
        },
        {
            "label": "LR Date",
            "fieldname": "custom_lr_date_1",
            "fieldtype": "Date",
        },
        {
            "label": "PM",
            "fieldname": "custom_pm",
            "fieldtype": "Data",
        },
        {
            "label": "Bilty No.",
            "fieldname": "custom_bilty_no",
            "fieldtype": "Data",
        },
        {
            "label": "Received Quantity",
            "fieldname": "received_qty",
            "fieldtype": "Float",
        },
        {
            "label": "Billed Amount",
            "fieldname": "billed_amt",
            "fieldtype": "Currency",
        },
        {
            "label": "Company",
            "fieldname": "company",
            "fieldtype": "Link",
            "options": "Company",
        },
    ]

    data = frappe.db.sql(
        """
        SELECT
            POI.item_code AS item_code,
            POI.item_name AS item_name,
            POI.item_group AS item_group,
            POI.description AS description,
            POI.qty AS qty,
            POI.uom AS uom,
            POI.rate AS rate,
            POI.amount AS amount,
            POI.parent AS purchase_order,
            PO.transaction_date AS transaction_date,
            PO.supplier AS supplier,
            PO.supplier_name AS supplier_name,
            PO.project AS project,
            PR.transporter_name AS transporter_name,
            PR.lr_no AS lr_no,
            PR.lr_date AS lr_date,
            PR.custom_lr_no_1 AS custom_lr_no_1,
            PR.custom_lr_date_1 AS custom_lr_date_1,
            PR.custom_pm AS custom_pm,
            PR.custom_bilty_no AS custom_bilty_no,
            POI.received_qty AS received_qty,
            POI.billed_amt AS billed_amt,
            PO.company AS company
        FROM `tabPurchase Order Item` POI
        JOIN `tabPurchase Order` PO ON POI.parent = PO.name
        JOIN `tabPurchase Receipt Item` PRI ON POI.name = PRI.purchase_order_item
        JOIN `tabPurchase Receipt` PR ON PRI.parent = PR.name
    """,
        as_dict=True,
    )

    return columns, data
