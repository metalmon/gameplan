# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt


import json
import logging

import frappe
from frappe.utils import cstr
from redis.commands.search.field import TagField, TextField
from redis.commands.search.indexDefinition import IndexDefinition
from redis.commands.search.query import Query
from redis.exceptions import ResponseError

logger = logging.getLogger(__name__)


class Search:
	def __init__(self, index_name, prefix, schema) -> None:
		self.redis = frappe.cache()
		self.index_name = index_name
		self.prefix = prefix
		self.schema = []
		for field in schema:
			self.schema.append(frappe._dict(field))

		# Check for RediSearch availability
		self.redisearch_available = self._check_redisearch_availability()
		if not self.redisearch_available:
			logger.warning(
				f"RediSearch module not found or unavailable for index '{self.index_name}'. Search functionality will be disabled."
			)

	def _check_redisearch_availability(self):
		try:
			# FT._LIST is a simple command to check if the module is loaded
			self.redis.execute_command("FT._LIST")
			return True
		except ResponseError as e:
			# Check if the error indicates an unknown command
			if "unknown command" in str(e).lower() or "wrong number of arguments" in str(e).lower():
				return False
			# Re-raise unexpected errors
			raise e
		except Exception as e:
			# Log other potential exceptions during check
			logger.error(f"Error checking RediSearch availability: {e}", exc_info=True)
			return False

	def create_index(self):
		if not self.redisearch_available:
			return

		index_def = IndexDefinition(
			prefix=[f"{self.redis.make_key(self.prefix).decode()}:"],
		)
		schema = []
		for field in self.schema:
			kwargs = {k: v for k, v in field.items() if k in ["weight", "sortable", "no_index", "no_stem", "separator"]}
			if field.type == "tag":
				schema.append(TagField(f"$.{field.name}", as_name=field.name, **kwargs))
			else:
				schema.append(TextField(f"$.{field.name}", as_name=field.name, **kwargs))

		try:
			self.redis.ft(self.index_name).create_index(schema, definition=index_def)
			self._index_exists = True
		except ResponseError as e:
			# If index already exists, ignore the error
			if "Index already exists" not in str(e):
				raise e
			self._index_exists = True

	def add_document(self, id, doc, payload=None):
		if not self.redisearch_available or not self.index_exists():
			return

		doc = frappe._dict(doc)
		doc_id = self.redis.make_key(f"{self.prefix}:{id}").decode()
		mapping = {}
		for field in self.schema:
			if field.name in doc:
				# Ensure tags are handled as strings if needed, or adjust based on field type
				value = doc[field.name]
				if isinstance(value, (list, tuple)):
					# Default separator, adjust if your TagField uses a different one
					separator = next((f.separator for f in self.schema if f.name == field.name and f.type == "tag"), ",")
					mapping[field.name] = separator.join(map(cstr, value))
				else:
					mapping[field.name] = cstr(value)

		if mapping: # Only add document if there's something to map
			for k, v in mapping.items():
				self.redis.hset(doc_id, k, v)
			if payload:
				self.redis.hset(doc_id, "_payload", json.dumps(payload))

	def remove_document(self, id):
		if not self.redisearch_available or not self.index_exists():
			return

		key = self.redis.make_key(f"{self.prefix}:{id}").decode()
		# Use DEL command for Hash documents used with JSON Path syntax
		self.redis.delete(key)

	def search(self, query, start=0, page_length=50, sort_by=None, highlight=False, with_payloads=False):
		if not self.redisearch_available or not self.index_exists():
			return frappe._dict({"total": 0, "docs": [], "duration": 0})

		_query = Query(self.clean_query(query)).paging(start, page_length)
		if highlight:
			_query = _query.highlight(tags=["<mark>", "</mark>"])
		if sort_by:
			parts = sort_by.split(" ")
			sort_field = parts[0]
			direction = parts[1] if len(parts) > 1 else "asc"
			# Ensure sort field exists in schema and is sortable
			is_sortable = any(f.name == sort_field and f.get("sortable") for f in self.schema)
			if is_sortable:
				_query = _query.sort_by(sort_field, asc=(direction.lower() == "asc"))
			else:
				logger.warning(f"Attempted to sort by non-sortable field '{sort_field}' in index '{self.index_name}'")

		if with_payloads:
			_query = _query.return_fields("_payload") # Request payload if needed

		try:
			result = self.redis.ft(self.index_name).search(_query)
		except ResponseError as e:
			# Log specific search errors but return empty results
			logger.error(f"RediSearch query failed for index '{self.index_name}': {e}", exc_info=True)
			return frappe._dict({"total": 0, "docs": [], "duration": 0})

		out = frappe._dict(docs=[], total=result.total, duration=result.duration)
		for doc in result.docs:
			# Assuming doc.id is in the format 'prefix:actual_id'
			doc_key = doc.id
			id_parts = doc_key.split(":")
			actual_id = id_parts[1] if len(id_parts) > 1 else doc_key # Fallback if prefix is missing

			_doc = frappe._dict(doc.__dict__)
			_doc.id = actual_id # Use the extracted ID

			# Remove the internal Redis key from the exposed doc
			if 'id' in _doc: del _doc['id'] # remove the key like 'search_doc:GP Discussion:DISC-00001'
			if '$' in _doc: del _doc['$'] # remove the root path indicator from redis json response

			# Handle payload if requested and exists
			payload_data = None
			if with_payloads and hasattr(doc, "_payload"):
				try:
					payload_data = json.loads(doc._payload)
				except (json.JSONDecodeError, TypeError):
					logger.warning(f"Failed to decode payload for doc id {actual_id}")
			_doc.payload = payload_data

			# Clean up field names (remove '$' if present from TextField/TagField definitions)
			cleaned_doc = frappe._dict()
			for key, value in _doc.items():
				if key == '_payload': continue # Already handled
				cleaned_key = key.lstrip('$.')
				cleaned_doc[cleaned_key] = value

			# Add the cleaned id back
			cleaned_doc.id = actual_id
			out.docs.append(cleaned_doc)

		return out

	def spellcheck(self, query, **kwargs):
		if not self.redisearch_available or not self.index_exists():
			return None # Or appropriate default like {} or []
		try:
			return self.redis.ft(self.index_name).spellcheck(query, **kwargs)
		except ResponseError as e:
			logger.error(f"RediSearch spellcheck failed for index '{self.index_name}': {e}", exc_info=True)
			return None # Or appropriate default

	def drop_index(self):
		# Check availability first
		if not self.redisearch_available:
			return
		# ... existing code ...
		# Use internal _index_exists flag if set, otherwise check redis
		_exists = getattr(self, "_index_exists", None)
		if _exists is None:
			_exists = self.index_exists() # This will check redis if flag not set

		if _exists:
			try:
				self.redis.ft(self.index_name).dropindex(delete_documents=True)
				self._index_exists = False # Update flag
			except ResponseError as e:
				# Log error but proceed, maybe index was already deleted
				logger.warning(f"Error dropping index '{self.index_name}': {e}")
				self._index_exists = False # Assume dropped or doesn't exist

	def index_exists(self):
		# Check availability first
		if not self.redisearch_available:
			return False
		# ... existing code ...
		# Return cached state if available
		_exists = getattr(self, "_index_exists", None)
		if _exists is not None:
			return _exists

		try:
			self.redis.ft(self.index_name).info()
			self._index_exists = True
		except ResponseError:
			self._index_exists = False
		return self._index_exists

	def clean_query(self, query):
		# Placeholder for query cleaning logic if needed
		return query
