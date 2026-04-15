<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-adjustments-horizontal"
      eyebrow="System"
      title="Fields"
      description="Custom fields should stay predictable: a clear label, a stable key and one type."
    >
      <template #badge>
        <UBadge v-if="!loading" color="info" variant="subtle">{{ allFields.length }} total</UBadge>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">
          New Field
        </UButton>
      </template>
    </AdminPageHeader>

    <AdminPanel
      title="Definitions"
      description="Switch entity type to keep the schema compact and focused."
      icon="i-heroicons-rectangle-group"
    >
      <div class="admin-filterbar">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="tab in entityTabs"
            :key="tab.value"
            class="admin-segmented__button"
            :class="activeTab === tab.value ? 'admin-segmented__button--active' : ''"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
            <span class="ml-1 text-[11px] opacity-70">{{ getCount(tab.value) }}</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>

      <div v-else-if="filteredFields.length" class="admin-list mt-5">
        <div v-for="field in filteredFields" :key="field.id" class="admin-row">
          <div class="admin-row__content">
            <div class="flex flex-wrap items-center gap-2">
              <p class="admin-row__title">{{ field.fieldLabel }}</p>
              <UBadge :color="typeColor(field.fieldType)" variant="subtle" size="xs">{{ typeLabel(field.fieldType) }}</UBadge>
              <UBadge v-if="field.isRequired" color="warning" variant="subtle" size="xs">Required</UBadge>
            </div>

            <p class="admin-row__meta font-mono">{{ field.fieldName }}</p>
            <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">Sort order {{ field.sortOrder }}</p>
          </div>

          <div class="admin-row__actions">
            <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs" @click="openEdit(field)" />
            <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="confirmDel(field)" />
          </div>
        </div>
      </div>

      <AdminEmptyState
        v-else
        icon="i-heroicons-rectangle-group"
        title="No custom fields"
        :description="`No custom fields for ${entityTabs.find(tab => tab.value === activeTab)?.label}.`"
      >
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">Add field</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">
            {{ editing ? "Edit Field" : "New Field" }}
          </h2>

          <div class="mt-6 space-y-4">
            <div class="admin-field">
              <label class="admin-field__label">Entity type</label>
              <USelect v-model="form.entityType" :items="entityTabs" value-key="value" :disabled="!!editing || saving" />
            </div>

            <div class="admin-form-grid admin-form-grid--2">
              <div class="admin-field">
                <label class="admin-field__label">Label</label>
                <UInput v-model="form.fieldLabel" :disabled="saving" placeholder="e.g. Patch Version" />
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Field name</label>
                <UInput v-model="form.fieldName" :disabled="!!editing || saving" placeholder="e.g. patch_version" />
                <p class="admin-field__hint">Letters, numbers and underscores only.</p>
              </div>
            </div>

            <div class="admin-form-grid admin-form-grid--2">
              <div class="admin-field">
                <label class="admin-field__label">Field type</label>
                <USelect v-model="form.fieldType" :items="fieldTypeOptions" value-key="value" :disabled="saving" />
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Sort order</label>
                <UInput v-model.number="form.sortOrder" type="number" :disabled="saving" placeholder="0" />
              </div>
            </div>

            <div v-if="form.fieldType === 'select'" class="admin-field">
              <label class="admin-field__label">Options</label>
              <UTextarea
                v-model="form.optionsText"
                :disabled="saving"
                :rows="4"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>

            <div class="admin-switch-row">
              <div class="admin-switch-row__content">
                <p class="admin-switch-row__title">Required</p>
                <p class="admin-switch-row__description">Required fields must be filled when editors save data.</p>
              </div>

              <USwitch v-model="form.isRequired" :disabled="saving" />
            </div>

            <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="saving" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" @click="save">{{ editing ? "Save" : "Create" }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>

            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete field?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <strong class="text-slate-950 dark:text-white">{{ delItem?.fieldLabel }}</strong> ({{ delItem?.fieldName }}) will be removed from the schema.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="delModal = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()

interface Field {
  id: number
  entityType: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOptions: string | null
  isRequired: boolean
  sortOrder: number
}

const allFields = ref<Field[]>([])
const loading = ref(true)
const activeTab = ref("profiles")

const entityTabs = [
  { label: "Profiles", value: "profiles" },
  { label: "WowUp", value: "wowup" },
  { label: "Layouts", value: "layouts" },
]

const fieldTypeOptions = [
  { label: "Text", value: "text" },
  { label: "Textarea", value: "textarea" },
  { label: "Number", value: "number" },
  { label: "Toggle", value: "toggle" },
  { label: "Dropdown", value: "select" },
]

const modalOpen = ref(false)
const editing = ref<Field | null>(null)
const saving = ref(false)
const formError = ref("")
const form = reactive({
  entityType: "profiles",
  fieldLabel: "",
  fieldName: "",
  fieldType: "text",
  sortOrder: 0,
  isRequired: false,
  optionsText: "",
})

const delModal = ref(false)
const delItem = ref<Field | null>(null)
const deleting = ref(false)

const filteredFields = computed(() => allFields.value.filter(field => field.entityType === activeTab.value))

function getCount(type: string) {
  return allFields.value.filter(field => field.entityType === type).length
}

function typeColor(type: string) {
  const colors: Record<string, string> = {
    text: "info",
    textarea: "purple",
    number: "success",
    toggle: "warning",
    select: "cyan",
  }
  return colors[type] || "neutral"
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    text: "Text",
    textarea: "Textarea",
    number: "Number",
    toggle: "Toggle",
    select: "Dropdown",
  }
  return labels[type] || type
}

async function load() {
  loading.value = true

  try {
    allFields.value = await apiFetch<Field[]>("/api/v1/admin/fields")
  } catch {
    toast.add({ title: "Error", color: "error" })
    allFields.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  editing.value = null
  formError.value = ""
  Object.assign(form, {
    entityType: activeTab.value,
    fieldLabel: "",
    fieldName: "",
    fieldType: "text",
    sortOrder: 0,
    isRequired: false,
    optionsText: "",
  })
  modalOpen.value = true
}

function openEdit(field: Field) {
  editing.value = field
  formError.value = ""
  let optionsText = ""
  if (field.fieldOptions) {
    try {
      optionsText = JSON.parse(field.fieldOptions).join("\n")
    } catch {
      optionsText = ""
    }
  }
  Object.assign(form, {
    entityType: field.entityType,
    fieldLabel: field.fieldLabel,
    fieldName: field.fieldName,
    fieldType: field.fieldType,
    sortOrder: field.sortOrder,
    isRequired: field.isRequired,
    optionsText,
  })
  modalOpen.value = true
}

async function save() {
  if (!form.fieldLabel.trim() || !form.fieldName.trim()) {
    formError.value = "Label and field name are required"
    return
  }

  saving.value = true
  formError.value = ""

  const fieldOptions = form.fieldType === "select" && form.optionsText.trim()
    ? form.optionsText.split("\n").map(option => option.trim()).filter(Boolean)
    : undefined

  try {
    if (editing.value) {
      await apiFetch(`/api/v1/admin/fields/${editing.value.id}`, {
        method: "PUT",
        body: {
          fieldLabel: form.fieldLabel,
          fieldType: form.fieldType,
          fieldOptions,
          isRequired: form.isRequired,
          sortOrder: form.sortOrder,
        },
      })
      toast.add({ title: "Field updated", color: "success" })
    } else {
      await apiFetch("/api/v1/admin/fields", { method: "POST", body: { ...form, fieldOptions } })
      toast.add({ title: "Field created", color: "success" })
    }

    modalOpen.value = false
    await load()
  } catch (error: unknown) {
    formError.value = errorMessage(error, "Error")
  } finally {
    saving.value = false
  }
}

function confirmDel(field: Field) {
  delItem.value = field
  delModal.value = true
}

async function doDelete() {
  if (!delItem.value) return
  deleting.value = true

  try {
    await apiFetch(`/api/v1/admin/fields/${delItem.value.id}`, { method: "DELETE" })
    toast.add({ title: "Field deleted", color: "success" })
    delModal.value = false
    await load()
  } catch {
    toast.add({ title: "Error", color: "error" })
  } finally {
    deleting.value = false
  }
}
</script>
