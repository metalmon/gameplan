import frappe
from packaging import version


def execute():
    """Ensure all required tables exist and have correct structure"""
    # Create missing tables if any
    if not frappe.db.table_exists("GP Team"):
        frappe.db.create_missing_tables()

    # Version specific migrations
    if version.parse(frappe.__version__) >= version.parse("15.0.0"):
        # Add any v15 specific table modifications
        modify_tables_for_v15()
    else:
        # Add any legacy version specific modifications
        modify_tables_for_legacy()


def modify_tables_for_v15():
    """Make any v15 specific table modifications"""
    pass


def modify_tables_for_legacy():
    """Make any legacy version specific table modifications"""
    pass
