<template>
  <vue-final-modal
    v-model="open"
    class="vue-lesson-host flex justify-end"
    content-class="modal-content-end"
    overlay-class="modal-overlay modal-overlay--soft"
    :click-to-close="true"
    :esc-to-close="true"
    :focus-trap="true"
  >
    <aside class="lesson-drawer" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header class="mb-[0.85rem] flex items-start justify-between gap-4">
        <div>
          <p class="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-live">
            Conceptos Vue
          </p>
          <h2 :id="titleId" class="m-0 font-display text-[1.35rem] leading-tight text-win">
            {{ lesson.heading }}
          </h2>
        </div>
        <button
          type="button"
          class="h-8 w-8 rounded border border-muted text-[1.25rem] leading-none text-white/80 hover:border-brand hover:text-brand"
          aria-label="Cerrar"
          @click="open = false"
        >
          ×
        </button>
      </header>

      <p class="mb-4 mt-0 leading-normal text-text-muted">{{ lesson.intro }}</p>

      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        <li v-for="item in lesson.items" :key="item.title" class="lesson-card">
          <div class="mb-[0.4rem] flex flex-wrap items-baseline justify-between gap-x-3 gap-y-[0.35rem]">
            <h3 class="m-0 text-base text-white">{{ item.title }}</h3>
            <code class="font-mono text-[0.72rem] text-live">{{ item.concept }}</code>
          </div>
          <p class="m-0 text-[0.9rem] leading-snug text-white/80">{{ item.body }}</p>
        </li>
      </ul>
    </aside>
  </vue-final-modal>
</template>

<script setup>
import { computed } from 'vue'
import { getVueLesson } from '../data/vueLessons.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  view: {
    type: String,
    default: 'setup',
  },
})

const emit = defineEmits(['update:modelValue'])

const titleId = 'vue-lesson-title'
const lesson = computed(() => getVueLesson(props.view === 'competition' ? 'competition' : 'setup'))

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>
