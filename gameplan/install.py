# Copyright (c) 2022, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

import frappe
from rembg import new_session

from gameplan.version import check_frappe_version


def before_install():
    """Run before installation"""
    check_frappe_version()


def after_install():
    """Run after installation"""
    create_default_records()
    download_rembg_model()


def after_migrate():
    """Run after migration"""
    if not frappe.db.table_exists("GP Team"):
        frappe.db.create_missing_tables()


def create_default_records():
    """Create default records"""
    if not frappe.db.exists("Role", "Gameplan Admin"):
        frappe.get_doc(
            {"doctype": "Role", "role_name": "Gameplan Admin", "desk_access": 1}
        ).insert(ignore_permissions=True)


def download_rembg_model():
    """Download ML model for background removal"""
    new_session()
