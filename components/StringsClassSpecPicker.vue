<!-- Class / specialization chips for /strings Cooldown Layouts. Presentational. -->
<template>
  <div>
    <span class="strings-label">Class</span>
    <div class="flex flex-wrap justify-center gap-2" role="listbox" aria-label="WoW classes">
      <button
        v-for="cls in classes"
        :key="cls"
        type="button"
        role="option"
        :aria-selected="selectedClass === cls"
        class="wow-class-chip"
        :class="selectedClass === cls ? 'is-active' : ''"
        @click="emit('selectClass', cls)"
      >
        <img
          v-if="wowClassIcon(cls)"
          :src="wowClassIcon(cls)!"
          :alt="''"
          class="wow-class-chip__icon"
          width="24"
          height="24"
          loading="lazy"
        />
        <span
          v-else
          class="wow-class-chip__icon inline-flex items-center justify-center text-[10px] font-bold"
          :style="{ background: wowClassColor(cls) + '33', color: wowClassColor(cls) }"
        >{{ cls.slice(0, 2) }}</span>
        <span>{{ cls }}</span>
      </button>
    </div>
  </div>
  <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
    <div v-if="selectedClass && specs.length">
      <span class="strings-label">Specialization</span>
      <div class="flex flex-wrap justify-center gap-2" role="listbox" aria-label="Specializations">
        <button
          v-for="spec in specs"
          :key="spec"
          type="button"
          role="option"
          :aria-selected="selectedSpec === spec"
          class="wow-class-chip"
          :class="selectedSpec === spec ? 'is-active' : ''"
          @click="emit('selectSpec', spec)"
        >
          <img
            v-if="wowSpecIcon(selectedClass, spec)"
            :src="wowSpecIcon(selectedClass, spec)!"
            alt=""
            class="wow-class-chip__icon"
            width="24"
            height="24"
            loading="lazy"
          />
          <span>{{ spec }}</span>
        </button>
      </div>
      <p v-if="sharesSpecs" class="mt-3 text-center mg-small mg-muted">
        This string imports {{ sharedSpecList }}.
      </p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import '~/assets/css/setup-strings.css'
import { wowClassIcon, wowClassColor } from '~/utils/wowClassIcons'
import { wowSpecIcon } from '~/utils/wowSpecs'

defineProps<{
  classes: string[]
  selectedClass: string
  specs: string[]
  selectedSpec: string
  sharesSpecs: boolean
  sharedSpecList: string
}>()

const emit = defineEmits<{
  selectClass: [cls: string]
  selectSpec: [spec: string]
}>()

</script>
