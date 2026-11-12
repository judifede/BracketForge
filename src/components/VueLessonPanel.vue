<template>
  <vue-final-modal
    v-model="open"
    class="vue-lesson-host flex justify-end"
    content-class="vue-lesson-content"
    overlay-class="vue-lesson-overlay"
    :click-to-close="true"
    :esc-to-close="true"
    :focus-trap="true"
  >
    <aside class="lesson-drawer" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header class="lesson-header">
        <div>
          <p class="lesson-kicker">Conceptos Vue</p>
          <h2 :id="titleId" class="lesson-title">{{ lesson.heading }}</h2>
        </div>
        <button type="button" class="close-btn" aria-label="Cerrar" @click="open = false">
          ×
        </button>
      </header>

      <p class="lesson-intro">{{ lesson.intro }}</p>

      <ul class="lesson-list">
        <li v-for="item in lesson.items" :key="item.title" class="lesson-card">
          <div class="lesson-card-top">
            <h3>{{ item.title }}</h3>
            <code>{{ item.concept }}</code>
          </div>
          <p>{{ item.body }}</p>
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

<style scoped>
.lesson-drawer {
  width: min(420px, 94vw);
  height: 100vh;
  margin-left: auto;
  padding: 1.25rem 1.25rem 2rem;
  overflow-y: auto;
  text-align: left;
  background: linear-gradient(180deg, #18222b 0%, var(--bg-panel) 100%);
  border-left: 1px solid var(--border-subtle);
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.35);
  animation: drawer-in 0.28s ease-out;
}

.lesson-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.lesson-kicker {
  margin: 0 0 0.25rem;
  color: var(--accent-live);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.lesson-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  color: var(--accent-win);
  line-height: 1.25;
}

.close-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  border: 1px solid var(--border-muted);
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.25rem;
  line-height: 1;
}

.close-btn:hover {
  border-color: var(--accent-brand);
  color: var(--accent-brand);
}

.lesson-intro {
  margin: 0 0 1rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.lesson-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lesson-card {
  padding: 0.85rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-slot) 88%, #101820);
}

.lesson-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.4rem;
}

.lesson-card h3 {
  margin: 0;
  font-size: 1rem;
  color: #fff;
}

.lesson-card code {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--accent-live);
}

.lesson-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.9rem;
  line-height: 1.45;
}

@keyframes drawer-in {
  from {
    transform: translateX(1rem);
    opacity: 0.6;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>

<style>
.vue-lesson-overlay {
  background: rgba(5, 8, 12, 0.55) !important;
}

.vue-lesson-content {
  margin-left: auto;
  height: 100%;
}
</style>
