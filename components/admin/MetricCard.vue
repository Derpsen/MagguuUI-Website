<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="admin-metric-card admin-metric-card--interactive"
  >
    <MetricCardInner
      :label="label"
      :value="value"
      :icon="icon"
      :hint="hint"
      :trend="trend"
      :tone="tone"
    >
      <slot />
      <template #footer>
        <slot name="footer" />
      </template>
    </MetricCardInner>
  </NuxtLink>

  <div v-else class="admin-metric-card">
    <MetricCardInner
      :label="label"
      :value="value"
      :icon="icon"
      :hint="hint"
      :trend="trend"
      :tone="tone"
    >
      <slot />
      <template #footer>
        <slot name="footer" />
      </template>
    </MetricCardInner>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

type MetricTone = 'brand' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral'

const rawProps = withDefaults(defineProps<{
  label: string
  value: string | number
  icon?: string
  hint?: string
  trend?: number | null
  tone?: MetricTone
  to?: string
}>(), {
  icon: 'i-heroicons-squares-2x2',
  hint: '',
  trend: null,
  tone: 'brand',
  to: undefined,
})

const { label, value, icon, hint, trend, tone, to } = toRefs(rawProps)

const toneClasses: Record<MetricTone, string> = {
  brand: 'admin-tone-brand',
  success: 'admin-tone-success',
  warning: 'admin-tone-warning',
  danger: 'admin-tone-danger',
  violet: 'admin-tone-violet',
  neutral: 'admin-tone-neutral',
}

const MetricCardInner = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
    icon: { type: String, default: 'i-heroicons-squares-2x2' },
    hint: { type: String, default: '' },
    trend: { type: Number, default: null },
    tone: { type: String as PropType<MetricTone>, default: 'brand' },
  },
  setup(innerProps, { slots }) {
    const showTrend = computed(() => typeof innerProps.trend === 'number' && innerProps.trend !== 0)

    return () => h('div', { class: 'flex flex-col gap-4' }, [
      h('div', { class: 'flex items-start justify-between gap-4' }, [
        h('div', { class: 'min-w-0 space-y-2' }, [
          h('p', { class: 'admin-metric-card__label' }, innerProps.label),
          h('p', { class: 'admin-metric-card__value' }, String(innerProps.value)),
        ]),
        h('div', { class: `admin-metric-card__icon ${toneClasses[innerProps.tone]}` }, [
          h(resolveComponent('UIcon'), { name: innerProps.icon, class: 'h-5 w-5' }),
        ]),
      ]),
      showTrend.value
        ? h('div', {
          class: `admin-metric-card__trend ${Number(innerProps.trend) > 0 ? 'admin-metric-card__trend--up' : 'admin-metric-card__trend--down'}`,
        }, [
          h(resolveComponent('UIcon'), {
            name: Number(innerProps.trend) > 0
              ? 'i-heroicons-arrow-trending-up'
              : 'i-heroicons-arrow-trending-down',
            class: 'h-3.5 w-3.5',
          }),
          h('span', `${Math.abs(Number(innerProps.trend))}%`),
        ])
        : null,
      slots.default?.(),
      innerProps.hint || slots.footer
        ? h('div', { class: 'admin-metric-card__footer' }, [
          innerProps.hint
            ? h('p', { class: 'admin-metric-card__hint' }, innerProps.hint)
            : null,
          slots.footer?.(),
        ])
        : null,
    ])
  },
})
</script>
