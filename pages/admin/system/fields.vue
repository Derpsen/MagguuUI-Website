<!--
  Admin — Field Management (Dynamic Field Definitions)
  Manage custom fields for Profiles, WowUp, Layouts
-->

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gradient">Manage Fields</h1>
      <UButton icon="i-heroicons-plus" @click="openCreate">New Field</UButton>
    </div>

    <!-- Entity Type Tabs -->
    <div class="flex gap-2 mb-6">
      <UButton
        v-for="tab in entityTabs" :key="tab.value"
        :variant="activeTab === tab.value ? 'solid' : 'ghost'"
        :color="activeTab === tab.value ? 'primary' : 'neutral'"
        size="sm"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <UBadge v-if="getCount(tab.value)" variant="subtle" size="xs" class="ml-1.5">
          {{ getCount(tab.value) }}
        </UBadge>
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
    </div>

    <!-- Fields Table -->
    <div v-else-if="filteredFields.length" class="glass rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr :class="isDark ? 'border-b border-brand-400/10' : 'border-b border-gray-200'">
              <th class="text-left px-4 py-3 text-xs font-semibold uppercase" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Label</th>
              <th class="text-left px-4 py-3 text-xs font-semibold uppercase" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Field Name</th>
              <th class="text-left px-4 py-3 text-xs font-semibold uppercase" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Type</th>
              <th class="text-center px-4 py-3 text-xs font-semibold uppercase w-20" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Required</th>
              <th class="text-center px-4 py-3 text-xs font-semibold uppercase w-16" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Pos.</th>
              <th class="text-right px-4 py-3 text-xs font-semibold uppercase w-28" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in filteredFields" :key="field.id" class="transition-colors"
              :class="isDark ? 'border-b border-brand-400/5 hover:bg-white/[0.02]' : 'border-b border-gray-100 hover:bg-gray-50/50'">
              <td class="px-4 py-3">
                <span class="text-sm font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">{{ field.fieldLabel }}</span>
              </td>
              <td class="px-4 py-3">
                <code class="text-xs font-mono px-1.5 py-0.5 rounded" :class="isDark ? 'text-silver-500 bg-brand-800/50' : 'text-gray-500 bg-gray-100'">{{ field.fieldName }}</code>
              </td>
              <td class="px-4 py-3">
                <UBadge :color="typeColor(field.fieldType)" variant="subtle" size="xs">{{ typeLabel(field.fieldType) }}</UBadge>
              </td>
              <td class="px-4 py-3 text-center">
                <UIcon v-if="field.isRequired" name="i-heroicons-check-circle" class="w-4 h-4 text-green-400" />
                <span v-else :class="isDark ? 'text-silver-700' : 'text-gray-300'">—</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-xs font-mono" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ field.sortOrder }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs" @click="openEdit(field)" />
                  <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="confirmDel(field)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between px-4 py-2.5" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
        <p class="text-[11px] tabular-nums" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Showing {{ filteredFields.length }} fields</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-rectangle-group" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
      <p class="mb-4" :class="isDark ? 'text-silver-500' : 'text-gray-500'">No custom fields for {{ entityTabs.find(t => t.value === activeTab)?.label }}.</p>
      <UButton icon="i-heroicons-plus" @click="openCreate">Add field</UButton>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-6" :class="isDark ? 'text-white' : 'text-gray-900'">{{ editing ? 'Edit Field' : 'New Field' }}</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Entity Type *</label>
              <USelect v-model="form.entityType" :items="entityTabs" value-key="value" :disabled="!!editing || saving" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Label *</label>
                <UInput v-model="form.fieldLabel" placeholder="e.g. Patch Version" :disabled="saving" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Field Name *</label>
                <UInput v-model="form.fieldName" placeholder="e.g. patch_version" :disabled="!!editing || saving" />
                <p class="text-[10px] mt-1" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Letters, numbers, underscores only</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Field Type *</label>
                <USelect v-model="form.fieldType" :items="fieldTypeOptions" value-key="value" :disabled="saving" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Sort Order</label>
                <UInput v-model.number="form.sortOrder" type="number" placeholder="0" :disabled="saving" />
              </div>
            </div>

            <!-- Select Options (only for select type) -->
            <div v-if="form.fieldType === 'select'">
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Options (one per line)</label>
              <UTextarea
                v-model="form.optionsText"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                :rows="4"
                :disabled="saving"
              />
            </div>

            <label class="flex items-center gap-2">
              <USwitch v-model="form.isRequired" :disabled="saving" />
              <span class="text-sm" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Required</span>
            </label>

            <UAlert v-if="formError" color="error" variant="subtle" icon="i-heroicons-exclamation-circle" :title="formError" />
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="modalOpen = false" :disabled="saving">Cancel</UButton>
            <UButton @click="save" :loading="saving">{{ editing ? 'Save' : 'Create' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Modal -->
    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete field?</h2>
              <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'"><strong>{{ delItem?.fieldLabel }}</strong> ({{ delItem?.fieldName }}) will be deleted. Existing data in this field will be preserved.</p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="delModal = false" :disabled="deleting">Cancel</UButton>
            <UButton color="error" @click="doDelete" :loading="deleting">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()

interface Field {
  id: number; entityType: string; fieldName: string; fieldLabel: string
  fieldType: string; fieldOptions: string | null; isRequired: boolean; sortOrder: number
}

const allFields = ref<Field[]>([])
const loading = ref(true)
const activeTab = ref('profiles')

const entityTabs = [
  { label: 'Addon Profiles', value: 'profiles' },
  { label: 'WowUp Strings', value: 'wowup' },
  { label: 'Character Layouts', value: 'layouts' },
]

const fieldTypeOptions = [
  { label: 'Text', value: 'text' },
  { label: 'Textarea', value: 'textarea' },
  { label: 'Number', value: 'number' },
  { label: 'Toggle (On/Off)', value: 'toggle' },
  { label: 'Dropdown (Select)', value: 'select' },
]

const modalOpen = ref(false)
const editing = ref<Field | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  entityType: 'profiles',
  fieldLabel: '',
  fieldName: '',
  fieldType: 'text',
  sortOrder: 0,
  isRequired: false,
  optionsText: '',
})

const delModal = ref(false)
const delItem = ref<Field | null>(null)
const deleting = ref(false)

const filteredFields = computed(() => allFields.value.filter(f => f.entityType === activeTab.value))
function getCount(type: string) { return allFields.value.filter(f => f.entityType === type).length }

function typeColor(t: string) {
  const map: Record<string, string> = { text: 'info', textarea: 'purple', number: 'success', toggle: 'warning', select: 'cyan' }
  return map[t] || 'neutral'
}
function typeLabel(t: string) {
  const map: Record<string, string> = { text: 'Text', textarea: 'Textarea', number: 'Number', toggle: 'Toggle', select: 'Dropdown' }
  return map[t] || t
}

async function load() {
  loading.value = true
  try { allFields.value = await apiFetch<Field[]>('/api/v1/admin/fields') }
  catch { toast.add({ title: 'Error', color: 'error' }) }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  editing.value = null; formError.value = ''
  Object.assign(form, { entityType: activeTab.value, fieldLabel: '', fieldName: '', fieldType: 'text', sortOrder: 0, isRequired: false, optionsText: '' })
  modalOpen.value = true
}

function openEdit(f: Field) {
  editing.value = f; formError.value = ''
  let optionsText = ''
  if (f.fieldOptions) { try { optionsText = JSON.parse(f.fieldOptions).join('\n') } catch {} }
  Object.assign(form, { entityType: f.entityType, fieldLabel: f.fieldLabel, fieldName: f.fieldName, fieldType: f.fieldType, sortOrder: f.sortOrder, isRequired: f.isRequired, optionsText })
  modalOpen.value = true
}

async function save() {
  if (!form.fieldLabel.trim() || !form.fieldName.trim()) { formError.value = 'Label and field name are required'; return }
  saving.value = true; formError.value = ''

  const fieldOptions = form.fieldType === 'select' && form.optionsText.trim()
    ? form.optionsText.split('\n').map(o => o.trim()).filter(Boolean)
    : undefined

  try {
    if (editing.value) {
      await apiFetch(`/api/v1/admin/fields/${editing.value.id}`, { method: 'PUT', body: { fieldLabel: form.fieldLabel, fieldType: form.fieldType, fieldOptions, isRequired: form.isRequired, sortOrder: form.sortOrder } })
      toast.add({ title: 'Field updated', color: 'success' })
    } else {
      await apiFetch('/api/v1/admin/fields', { method: 'POST', body: { ...form, fieldOptions } })
      toast.add({ title: 'Field created', color: 'success' })
    }
    modalOpen.value = false; await load()
  } catch (e: any) { formError.value = e?.data?.message || 'Error' } finally { saving.value = false }
}

function confirmDel(f: Field) { delItem.value = f; delModal.value = true }
async function doDelete() {
  if (!delItem.value) return; deleting.value = true
  try { await apiFetch(`/api/v1/admin/fields/${delItem.value.id}`, { method: 'DELETE' }); toast.add({ title: 'Field deleted', color: 'success' }); delModal.value = false; await load() }
  catch { toast.add({ title: 'Error', color: 'error' }) } finally { deleting.value = false }
}
</script>
