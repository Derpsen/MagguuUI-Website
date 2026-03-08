/**
 * useFields — Dynamic field management composable
 * Loads field definitions for an entity type, manages custom field values
 */

export interface FieldDefinition {
  id: number
  entityType: string
  fieldName: string
  fieldLabel: string
  fieldType: 'text' | 'textarea' | 'number' | 'toggle' | 'select'
  fieldOptions: string | null // JSON array for select
  isRequired: boolean
  sortOrder: number
}

export function useFields(entityType: string) {
  const { apiFetch } = useApi()
  const fields = ref<FieldDefinition[]>([])
  const fieldsLoading = ref(false)

  async function loadFields() {
    fieldsLoading.value = true
    try {
      fields.value = await apiFetch<FieldDefinition[]>(`/api/v1/admin/fields?entityType=${entityType}`)
    } catch {
      fields.value = []
    } finally {
      fieldsLoading.value = false
    }
  }

  /**
   * Parse customFields JSON from a DB record into an object
   */
  function parseCustomFields(raw: string | null | undefined): Record<string, any> {
    if (!raw) return {}
    try { return JSON.parse(raw) } catch { return {} }
  }

  /**
   * Build initial custom fields object with defaults from field definitions
   */
  function buildCustomFieldDefaults(): Record<string, any> {
    const obj: Record<string, any> = {}
    for (const f of fields.value) {
      if (f.fieldType === 'toggle') obj[f.fieldName] = false
      else if (f.fieldType === 'number') obj[f.fieldName] = 0
      else obj[f.fieldName] = ''
    }
    return obj
  }

  /**
   * Merge existing custom field values with defaults
   */
  function mergeCustomFields(existing: Record<string, any>): Record<string, any> {
    const defaults = buildCustomFieldDefaults()
    return { ...defaults, ...existing }
  }

  /**
   * Get parsed options for a select field
   */
  function getSelectOptions(field: FieldDefinition): string[] {
    if (!field.fieldOptions) return []
    try { return JSON.parse(field.fieldOptions) } catch { return [] }
  }

  return {
    fields,
    fieldsLoading,
    loadFields,
    parseCustomFields,
    buildCustomFieldDefaults,
    mergeCustomFields,
    getSelectOptions,
  }
}
