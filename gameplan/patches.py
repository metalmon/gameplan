# Ensure migrations are compatible with both versions
def execute():
    if frappe.utils.version.parse_version(
        frappe.__version__
    ) >= frappe.utils.version.parse_version("15.0.0"):
        # Version 15+ migration
        pass
    else:
        # Pre-version 15 migration
        pass
