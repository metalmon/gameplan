# Copyright (c) 2023, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document

from gameplan.search import GameplanSearch
from gameplan.utils import url_safe_slug


class GPPage(Document):
	def before_save(self):
		self.slug = url_safe_slug(self.title)

	def on_update(self):
		self.update_search_index()

	def update_search_index(self):
		if self.has_value_changed("title") or self.has_value_changed("content"):
			search = GameplanSearch()
			search.index_doc(self)

	def on_trash(self):
		search = GameplanSearch()
		search.remove_doc(self)


def has_permission(doc, user, ptype):
	if doc.project:
		# pages in projects accessible by everyone
		return True
	if doc.owner == user:
		# private pages
		return True
	return False
