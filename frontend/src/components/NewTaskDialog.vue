<template>
  <Dialog
    :options="{
      title: __('New Task'),
      actions: [
        {
          label: __('Create'),
          variant: 'solid',
          onClick: onCreateClick,
        },
      ],
    }"
    :disableOutsideClickToClose="disableOutsideClickToClose"
    v-model="showDialog"
    @after-leave="newTask = initialData"
  >
    <template #body-content>
      <div class="space-y-4">
        <FormControl :label="__('Title')" v-model="newTask.title" autocomplete="off" />
        <FormControl :label="__('Description')" type="textarea" v-model="newTask.description" />
        <div class="flex space-x-2">
          <Dropdown
            :options="
              statusOptions({
                onClick: (status) => (newTask.status = status),
              })
            "
          >
            <Button>
              <template #prefix>
                <TaskStatusIcon :status="newTask.status" />
              </template>
              {{ statusLabels[newTask.status] }}
            </Button>
          </Dropdown>
          <TextInput type="date" :placeholder="__('Set due date')" v-model="newTask.due_date" />
          <Autocomplete
            :placeholder="__('Assign a user')"
            :options="assignableUsers"
            v-model="newTask.assigned_to"
          />
        </div>
        <ErrorMessage class="mt-2" :message="createTask.error" />
      </div>
    </template>
  </Dialog>
</template>
<script setup>
import { ref, computed, h } from 'vue'
import { Dialog, FormControl, Autocomplete, Dropdown, TextInput, createResource } from 'frappe-ui'
import TaskStatusIcon from './icons/TaskStatusIcon.vue'
import { activeUsers } from '@/data/users'
import { statusLabels } from '@/utils/statusLabels'
const props = defineProps(['modelValue', 'defaults'])
const emit = defineEmits(['update:modelValue'])
const showDialog = ref(false)
const createTask = createResource({
  url: 'frappe.client.insert',
  makeParams(values) {
    return {
      doc: {
        doctype: 'GP Task',
        ...values,
      },
    }
  },
})
const initialData = {
  title: '',
  description: '',
  status: 'Backlog',
  assigned_to: null,
  project: null,
}

const newTask = ref(initialData)

function statusOptions({ onClick }) {
  return Object.keys(statusLabels).map((status) => {
    return {
      icon: () => h(TaskStatusIcon, { status }),
      label: statusLabels[status],
      onClick: () => onClick(status),
    }
  })
}

const assignableUsers = computed(() => {
  return activeUsers.value.map((user) => ({
    label: user.full_name,
    value: user.name,
  }))
})

let _onSuccess
function show({ defaults, onSuccess } = {}) {
  newTask.value = { ...initialData, ...(defaults || {}) }
  showDialog.value = true
  _onSuccess = onSuccess
}

function onCreateClick(close) {
  let newTaskDoc = {
    ...newTask.value,
    assigned_to: newTask.value.assigned_to?.value,
  }
  createTask
    .submit(newTaskDoc, {
      validate() {
        if (!newTask.value.title) {
          return __('Task title is required')
        }
      },
      onSuccess: _onSuccess,
    })
    .then(close())
}

let disableOutsideClickToClose = computed(() => {
  return createTask.loading || newTask.value?.title != ''
})

defineExpose({ show })
</script>
