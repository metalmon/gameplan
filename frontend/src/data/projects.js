import { computed } from 'vue'
import { createListResource, createResource } from 'frappe-ui'

export let projects = createListResource({
  doctype: 'GP Project',
  fields: [
    'name',
    'title',
    'icon',
    'team',
    'archived_at',
    'is_private',
    'modified',
    'tasks_count',
    'discussions_count',
  ],
  orderBy: 'title asc',
  pageLength: 999,
  cache: 'Projects',
  transform(projects) {
    return projects.map((project) => {
      project.route = {
        name: 'Project',
        params: {
          teamId: project.team,
          projectId: project.name,
        },
      }
      return project
    })
  },
  auto: true,
  realtime: true,
  onSocketMessage(data) {
    if (data.message && data.message.project_deleted) {
      const { project, merged_with, team, old_team } = data.message
      if (this.data) {
        const index = this.data.findIndex(p => p.name === project)
        if (index !== -1) {
          this.data.splice(index, 1)
        }
      }
      // Проверяем оба возможных пути - и со старой, и с новой командой
      const currentPath = window.location.pathname
      if (currentPath.includes(`/g/${old_team}/projects/${project}`) || 
          currentPath.includes(`/projects/${project}`)) {
        window.location.href = `/g/${team}/projects/${merged_with}`
      }
    }
  }
})

// Создаем ресурс для получения одного проекта
export let project = createResource({
  url: 'gameplan.extends.client.get',
  params: {
    doctype: 'GP Project'
  },
  transform(data) {
    return data
  }
})

export function getTeamProjects(team) {
  return activeProjects.value.filter((project) => project.team === team) || []
}

export let activeProjects = computed(
  () => projects.data?.filter((project) => !project.archived_at) || [],
)

export let archivedProjects = computed(
  () => projects.data?.filter((project) => project.archived_at) || [],
)

export function getTeamArchivedProjects(team) {
  return archivedProjects.value.filter((project) => project.team === team) || []
}

export let getProject = (projectId) => {
  if (projectId == null) return null
  return project.submit({ name: projectId })
}
