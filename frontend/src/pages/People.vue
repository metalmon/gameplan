<template>
  <div class="flex h-full flex-col">
    <div class="flex flex-1">
      <div class="w-full">
        <header class="sticky top-0 z-10 border-b bg-surface-white px-4 py-2.5 sm:px-5">
          <div class="flex items-center justify-between">
            <Breadcrumbs :items="[{ label: __('People'), route: { name: 'People' } }]" />
            <div class="h-7"></div>
          </div>
        </header>
        <div class="mx-auto w-full max-w-4xl px-5 pt-6">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-normal text-ink-gray-5">
              {{ __('Total: {0}', [people.length]) }}
            </h2>
            <div class="flex items-center gap-2">
              <TextInput
                class="hidden sm:block"
                type="text"
                :placeholder="__('Search')"
                v-model="search"
                :debounce="500"
              >
                <template #prefix>
                  <LucideSearch class="w-4 text-ink-gray-5" />
                </template>
              </TextInput>
              <Select
                class="w-44 pl-7 pr-7"
                :options="[
                  { label: __('Name'), value: 'full_name asc' },
                  { label: __('Last updated'), value: 'modified desc' },
                  { label: __('Posts'), value: 'posts' },
                  { label: __('Replies'), value: 'replies' },
                ]"
                v-model="orderBy"
              >
                <template #prefix>
                  <LucideArrowDownUp class="w-4 text-ink-gray-5" />
                </template>
              </Select>
              <Button variant="solid" @click="showSettingsDialog('Invites')">
                <template #prefix><LucideUserPlus2 class="w-4" /></template>
                {{ __('Invite') }}
              </Button>
            </div>
          </div>
          <div class="sm:hidden mt-4">
            <TextInput
              class="w-full"
              type="text"
              :placeholder="__('Search')"
              v-model="search"
              :debounce="500"
            >
              <template #prefix>
                <LucideSearch class="w-4 text-ink-gray-5" />
              </template>
            </TextInput>
          </div>
          <div class="mt-6 pb-16">
            <template v-for="user in people" :key="user.name">
              <router-link
                :to="{
                  name: 'PersonProfile',
                  params: {
                    personId: user.name,
                  },
                }"
                class="flex rounded px-2 py-2.5 hover:bg-surface-gray-2"
                exact-active-class="!bg-surface-gray-2"
              >
                <div class="flex w-3/5 items-center">
                  <UserAvatar :user="user.user" size="2xl" />
                  <div class="ml-3 min-w-0">
                    <div class="flex items-center space-x-2">
                      <div class="text-base font-medium text-ink-gray-9">
                        {{ $user(user.user).full_name }}
                      </div>
                      <Badge v-if="$user(user.user).isGuest">{{ __('Guest') }}</Badge>
                    </div>
                    <div
                      v-if="user.bio"
                      class="mt-1.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base text-ink-gray-5"
                    >
                      {{ user.bio }}
                    </div>
                  </div>
                </div>
                <div class="flex w-1/5 items-center justify-end text-right">
                  <router-link
                    class="text-base text-ink-gray-5 hover:text-ink-gray-9"
                    :to="{
                      name: 'PersonProfilePosts',
                      params: { personId: user.name },
                    }"
                    @click.prevent
                  >
                    {{ __('posts') }}: {{ user.discussions_count }}
                  </router-link>
                </div>
                <div
                  class="flex w-1/5 items-center justify-end text-right text-base text-ink-gray-5"
                >
                  <router-link
                    class="text-base text-ink-gray-5 hover:text-ink-gray-9"
                    :to="{
                      name: 'PersonProfileReplies',
                      params: { personId: user.name },
                    }"
                    @click.prevent
                  >
                    {{ __('replies') }}: {{ user.comments_count }}
                  </router-link>
                </div>
              </router-link>
              <div class="mx-2 border-b"></div>
            </template>
            <div class="p-3" v-if="$resources.profiles.hasNextPage">
              <Button
                @click="$resources.profiles.next()"
                :loading="$resources.profiles.list.loading"
              >
                {{ __('Load more') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { Breadcrumbs, Badge, Input, Select, TextInput } from 'frappe-ui'
import { showSettingsDialog } from '@/components/Settings/SettingsDialog.vue'

export default {
  name: 'People',
  props: ['person'],
  components: { Badge, Input, TextInput, Select, Breadcrumbs },
  data() {
    return {
      search: '',
      orderBy: 'modified desc',
    }
  },
  setup() {
    return {
      showSettingsDialog,
    }
  },
  resources: {
    profiles() {
      let orderBy = this.orderBy
      if (['posts', 'replies'].includes(orderBy)) {
        orderBy = 'modified desc'
      }
      return {
        type: 'list',
        url: '/api/method/gameplan.gameplan.doctype.gp_user_profile.gp_user_profile.get_list',
        cache: ['People', orderBy],
        doctype: 'GP User Profile',
        filters: { enabled: 1 },
        fields: ['name', 'user', 'bio', 'modified', 'cover_image', 'cover_image_position'],
        pageLength: 999,
        orderBy: this.orderBy,
        auto: true,
      }
    },
  },
  computed: {
    people() {
      if (!this.profiles.length) return []
      let myProfile = this.profiles.find((p) => p.user == this.$user().name)
      if (this.search) {
        return this.profiles.filter((p) => {
          return (
            p.full_name.toLowerCase().includes(this.search.toLowerCase()) ||
            p.email.toLowerCase().includes(this.search.toLowerCase())
          )
        })
      }

      let list = [myProfile, ...this.profiles.filter((p) => p != myProfile)].filter(Boolean)

      if (this.orderBy == 'posts') {
        list = list.sort((a, b) => b.discussions_count - a.discussions_count)
      } else if (this.orderBy == 'replies') {
        list = list.sort((a, b) => b.comments_count - a.comments_count)
      }
      return list
    },
    profiles() {
      return (this.$resources.profiles.data || []).map((profile) => {
        return {
          ...profile,
          email: this.$user(profile.user).email,
          full_name: this.$user(profile.user).full_name,
        }
      })
    },
  },
  methods: {
    coverImageUrl(url) {
      if (!url) return null
      if (url.startsWith('https://images.unsplash.com')) {
        return url + '&w=300&fit=crop&crop=entropy,faces,focalpoint'
      }
      return url
    },
  },
  pageMeta() {
    return {
      title: __('People'),
    }
  },
}
</script>
