import frappe
from packaging import version


def check_frappe_version():
    """Utility function to check Frappe version compatibility"""
    try:
        current_version = version.parse(frappe.__version__)
        required_version = version.parse("15.0.0")
        return current_version >= required_version
    except Exception:
        return False
