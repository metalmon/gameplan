# Copyright (c) 2022, Frappe Technologies Pvt Ltd and contributors
# For license information, please see license.txt

from urllib.parse import urljoin

import frappe
from frappe import _
import requests
from bs4 import BeautifulSoup
from frappe.model.document import Document
from pypika.terms import ExistsCriterion

import gameplan
from gameplan.api import invite_by_email
from gameplan.gemoji import get_random_gemoji
from gameplan.mixins.archivable import Archivable
from gameplan.mixins.manage_members import ManageMembersMixin


class GPProject(ManageMembersMixin, Archivable, Document):
	on_delete_cascade = [
		"GP Task",
		"GP Discussion",
		"GP Project Visit",
		"GP Followed Project",
		"GP Page",
		"GP Pinned Project",
	]
	on_delete_set_null = ["GP Notification"]

	@staticmethod
	def get_list_query(query):
		Project = frappe.qb.DocType("GP Project")
		Member = frappe.qb.DocType("GP Member")
		member_exists = (
			frappe.qb.from_(Member)
			.select(Member.name)
			.where(Member.parenttype == "GP Team")
			.where(Member.parent == Project.team)
			.where(Member.user == frappe.session.user)
		)
		query = query.where(
			(Project.is_private == 0) | ((Project.is_private == 1) & ExistsCriterion(member_exists))
		)
		if gameplan.is_guest():
			GuestAccess = frappe.qb.DocType("GP Guest Access")
			project_list = GuestAccess.select(GuestAccess.project).where(
				GuestAccess.user == frappe.session.user
			)
			query = query.where(Project.name.isin(project_list))
		return query

	def as_dict(self, *args, **kwargs) -> dict:
		d = super().as_dict(*args, **kwargs)
		# summary
		total_tasks = frappe.db.count("GP Task", {"project": self.name})
		completed_tasks = frappe.db.count("GP Task", {"project": self.name, "is_completed": 1})
		pending_tasks = total_tasks - completed_tasks
		overdue_tasks = frappe.db.count(
			"GP Task",
			{"project": self.name, "is_completed": 0, "due_date": ("<", frappe.utils.today())},
		)
		d.summary = {
			"total_tasks": total_tasks,
			"completed_tasks": completed_tasks,
			"pending_tasks": pending_tasks,
			"overdue_tasks": overdue_tasks,
		}
		d.is_pinned = bool(
			frappe.db.exists("GP Pinned Project", {"project": self.name, "user": frappe.session.user})
		)
		return d

	def before_insert(self):
		if not self.icon:
			self.icon = get_random_gemoji().emoji

		if not self.readme:
			welcome_text = _("Welcome to the {0}!").format(self.title)
			intro_text = _("You can add a brief introduction about this project, links, resources, and other important information here.")
			self.readme = f"""<h3>{welcome_text}</h3>
			<p>{intro_text}</p>
			"""

		self.append(
			"members",
			{
				"user": frappe.session.user,
				"email": frappe.session.user,
				"role": "Project Owner",
				"status": "Accepted",
			},
		)

	def before_save(self):
		if frappe.db.get_value("GP Team", self.team, "is_private"):
			self.is_private = True

	def update_progress(self):
		result = frappe.db.get_all(
			"GP Task",
			filters={"project": self.name},
			fields=["sum(is_completed) as completed", "count(name) as total"],
		)[0]
		if result.total > 0:
			self.progress = (result.completed or 0) * 100 / result.total
			self.save()
			self.reload()

	def delete_group(self, group):
		tasks = frappe.db.count("GP Task", {"project": self.name, "status": group})
		if tasks > 0:
			frappe.throw(_("Group {0} cannot be deleted because it has {1} tasks").format(group, tasks))

		for state in self.task_states:
			if state.status == group:
				self.remove(state)
				self.save()
				break

	def get_activities(self):
		activities = []
		activities.append(
			{
				"type": "info",
				"title": "Project created",
				"date": self.creation,
				"user": self.owner,
			}
		)
		status_updates = frappe.db.get_all(
			"Team Project Status Update",
			{"project": self.name},
			["creation", "owner", "content", "status"],
			order_by="creation desc",
		)
		for status_update in status_updates:
			activities.append(
				{
					"type": "content",
					"title": "Status Update",
					"content": status_update.content,
					"status": status_update.status,
					"date": frappe.utils.get_datetime(status_update.creation),
					"user": status_update.owner,
				}
			)
		activities.sort(key=lambda x: x["date"], reverse=True)
		return activities

	@frappe.whitelist()
	def move_to_team(self, team):
		if not team or self.team == team:
			return
		self.team = str(team)
		self.save()
		for doctype in ["GP Task", "GP Discussion"]:
			for name in frappe.db.get_all(doctype, {"project": self.name}, pluck="name"):
				doc = frappe.get_doc(doctype, name)
				doc.team = self.team
				doc.save()

	@frappe.whitelist()
	def merge_with_project(self, project=None):
		if not project or self.name == project:
			return
		project = str(project)
		if not frappe.db.exists("GP Project", project):
			frappe.throw(_('Invalid Project "{0}"').format(project))
		
		# Получаем команду целевого проекта до слияния
		target_team = frappe.db.get_value('GP Project', project, 'team')
		old_name = self.name
		old_team = self.team
		
		# Выполняем слияние
		result = self.rename(project, merge=True, validate_rename=False, force=True)
		
		# Получаем обновленный документ
		merged_project = frappe.get_doc('GP Project', project)
		
		# Обновляем команду для всех связанных записей
		for doctype in ["GP Task", "GP Discussion"]:
			frappe.db.sql("""
				UPDATE `tab{doctype}`
				SET team = %s
				WHERE project = %s
			""".format(doctype=doctype), (target_team, project))
		
		# Обновляем команду в проекте, если она изменилась
		if merged_project.team != target_team:
			merged_project.team = target_team
			merged_project.save()
		
		# Уведомляем фронтенд об удалении старого проекта
		frappe.publish_realtime('project_deleted', {
			'project': old_name,
			'merged_with': project,
			'team': target_team,
			'old_team': old_team
		})
		
		return {
			'project': project,
			'team': target_team,
			'old_team': old_team
		}

	@frappe.whitelist()
	def invite_guest(self, email):
		invite_by_email(email, role="Gameplan Guest", projects=[self.name])

	@frappe.whitelist()
	def remove_guest(self, email):
		name = frappe.db.get_value("GP Guest Access", {"project": self.name, "user": email})
		if name:
			frappe.delete_doc("GP Guest Access", name)

	@frappe.whitelist()
	def track_visit(self):
		if frappe.flags.read_only:
			return

		values = {"user": frappe.session.user, "project": self.name}
		existing = frappe.db.get_value("GP Project Visit", values)
		if existing:
			frappe.db.set_value("GP Project Visit", existing, "last_visit", frappe.utils.now())
		else:
			visit = frappe.get_doc(doctype="GP Project Visit")
			visit.update(values)
			visit.last_visit = frappe.utils.now()
			visit.insert(ignore_permissions=True)

	@property
	def is_followed(self):
		return bool(
			frappe.db.exists("GP Followed Project", {"project": self.name, "user": frappe.session.user})
		)

	@frappe.whitelist()
	def follow(self):
		if not self.is_followed:
			frappe.get_doc(doctype="GP Followed Project", project=self.name).insert(ignore_permissions=True)

	@frappe.whitelist()
	def unfollow(self):
		follow_id = frappe.db.get_value(
			"GP Followed Project", {"project": self.name, "user": frappe.session.user}
		)
		frappe.delete_doc("GP Followed Project", follow_id)


def get_meta_tags(url):
	response = requests.get(url, timeout=2, allow_redirects=True)
	soup = BeautifulSoup(response.text, "html.parser")
	title = soup.find("title").text.strip()

	image = None
	favicon = soup.find("link", rel="icon")
	if favicon:
		image = favicon["href"]

	if image and image.startswith("/"):
		image = urljoin(url, image)

	return {"title": title, "image": image}
