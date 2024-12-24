<template>
  <header class="sticky top-0 z-10 border-b bg-surface-white px-4 py-2.5 sm:px-5">
    <div class="flex items-center justify-between">
      <Breadcrumbs :items="[{ label: __('Notifications'), route: { name: 'Notifications' } }]" />
      <div class="flex h-7 items-center space-x-2">
        <Button
          @click="$resources.markAllAsRead.submit"
          :loading="$resources.markAllAsRead.loading"
          v-if="activeTab === 'Unread' && notifications?.length > 0"
        >
          {{ __('Mark all as read') }}
        </Button>
        <TabButtons
          :buttons="[
            { label: __('Unread'), value: 'unread' },
            { label: __('Read'), value: 'read' }
          ]"
          v-model="activeTab"
        />
      </div>
    </div>
  </header>
  <div class="mx-auto w-full max-w-4xl px-5 pt-6">
    <KeepAlive>
      <div class="divide-y">
        <div class="flex items-center justify-between py-2" v-for="d in notifications" :key="d.name">
          <div class="flex items-start space-x-2">
            <UserAvatar size="sm" :user="d.from_user" v-if="d.from_user" />
            <div class="grid h-5 w-5 place-items-center" v-if="d.type === 'Reaction'">
              <LucideHeart class="h-4 w-4 text-ink-gray-7" />
            </div>
            <div class="text-base text-ink-gray-9">
              {{ d.message }} {{ $dayjs(d.creation).fromNow() }}
            </div>
          </div>
          <div class="ml-2 flex shrink-0 items-center space-x-2">
            <router-link
              v-if="d.discussion || d.task && d.team"
              class="block text-sm font-medium text-ink-gray-5 hover:text-ink-gray-7"
              :to="getNotificationLink(d)"
              @click="markAsRead(d.name)"
            >
              {{ d.discussion ? __('View Discussion') : d.task ? __('View Task') : '' }}
            </router-link>
            <Tooltip text="Mark as read">
              <Button v-if="!d.read" variant="ghost" @click="markAsRead(d.name)">
                <template #icon>
                  <LucideX class="w-4" />
                </template>
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </KeepAlive>
    <div v-if="!notifications?.length" class="text-base text-ink-gray-5">
      {{ __("Nothing to see here") }}
    </div>
  </div>
</template>

<script>
import { TabButtons, Tooltip, Breadcrumbs } from 'frappe-ui'
import Link from '@/components/Link.vue'

export default {
  name: 'Notifications',
  components: { TabButtons, Tooltip, Link, Breadcrumbs },
  data() {
    return {
      activeTab: 'unread',
    }
  },
  computed: {
    notifications() {
      const data = this.activeTab === 'unread'
        ? this.$resources.unreadNotifications?.data
        : this.$resources.readNotifications?.data

      return data || []
    }
  },
  watch: {
    activeTab() {
      const resource = this.activeTab === 'unread'
        ? this.$resources.unreadNotifications
        : this.$resources.readNotifications

      if (resource) {
        resource.reload()
      }
    }
  },
  resources: {
    unreadNotifications() {
      const userName = this.$user()?.name
      if (!userName) return null

      return {
        type: 'list',
        cache: false,
        doctype: 'GP Notification',
        filters: {
          to_user: userName,
          read: 0
        },
        fields: ['*'],
        orderBy: 'creation desc',
        auto: true
      }
    },
    readNotifications() {
      const userName = this.$user()?.name
      if (!userName) return null

      return {
        type: 'list',
        cache: false,
        doctype: 'GP Notification',
        filters: {
          to_user: userName,
          read: 1
        },
        fields: ['*'],
        orderBy: 'creation desc',
        auto: true
      }
    },
    markAllAsRead: {
      url: 'gameplan.api.mark_all_notifications_as_read',
      onSuccess() {
        this.$getResource('Unread Notifications Count')?.reload()
        this.$resources.unreadNotifications?.reload()
      },
    },
  },
  methods: {
    getNotificationLink(notification) {
      if (!notification.team) {
        console.warn('Missing team ID for notification:', notification)
        return null
      }

      if (notification.discussion) {
        return {
          name: 'ProjectDiscussion',
          params: {
            postId: notification.discussion,
            projectId: notification.project,
            teamId: notification.team,
          },
          query: notification.comment ? { comment: notification.comment } : null,
        }
      }

      if (notification.task) {
        return {
          name: 'ProjectTaskDetail',
          params: {
            teamId: notification.team,
            projectId: notification.project,
            taskId: notification.task,
          },
          query: notification.comment ? { comment: notification.comment } : null,
        }
      }

      return null
    },
    markAsRead(name) {
      this.$resources.unreadNotifications?.setValue.submit(
        { name, read: 1 },
        {
          onSuccess: () => {
            this.$getResource('Unread Notifications Count')?.reload()
            this.$resources.unreadNotifications?.reload()
          },
        }
      )
    },
  },
  mounted() {
    this.$getResource('Unread Notifications Count')?.reload()
  },
}
</script>
