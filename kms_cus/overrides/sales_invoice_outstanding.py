import frappe
from erpnext.accounts.utils import get_balance_on

@frappe.whitelist()
def get_customer_previous_outstanding(customer, company=None):
    """
    Fetch the previous outstanding amount of the given customer.
    """
    if not customer:
        return 0

    return get_balance_on(
        party_type="Customer",
        party=customer,
        company=company
    )
