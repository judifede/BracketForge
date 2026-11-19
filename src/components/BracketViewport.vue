<template>
  <div
    class="bracket-scroll-wrap relative w-full max-w-full"
    data-tour="bracket-viewport"
    title="Clic en un rival para elegir o corregir el ganador"
  >
    <!-- pointer-events-none on the chrome stack so it never steals slot hits;
         re-enable only on the zoom controls themselves. -->
    <div
      class="pointer-events-none absolute right-8 bottom-8 z-[3] flex flex-col-reverse items-end gap-[0.35rem]"
    >
      <div class="zoom-controls pointer-events-auto" data-tour="bracket-zoom">
        <button type="button" class="zoom-btn" aria-label="Alejar" @click="zoomOut">−</button>
        <span class="min-w-[2.6rem] text-center text-[0.72rem] font-semibold text-text-muted">
          {{ Math.round(scale * 100) }}%
        </span>
        <button type="button" class="zoom-btn" aria-label="Acercar" @click="zoomIn">+</button>
        <button type="button" class="zoom-btn zoom-btn--wide" @click="resetView">Reset</button>
      </div>
      <p class="scroll-hint" role="status" aria-live="polite">
        Rueda · Ctrl+rueda <span aria-hidden="true">↔</span>
        <span class="sr-only">: rueda vertical, Ctrl+rueda horizontal</span>
      </p>
    </div>

    <div
      ref="scrollEl"
      class="bracket-scroll"
      :class="{ 'is-panning': isPanning }"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div
        class="overflow-hidden shrink-0"
        :style="{
          width: `${width * scale}px`,
          height: `${height * scale}px`,
        }"
      >
        <div
          class="transition-transform duration-[120ms] ease-out"
          :style="{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }"
        >
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  /** Ancho del contenido en píxeles (sin escala). */
  width: {
    type: Number,
    required: true,
  },
  /** Alto del contenido en píxeles (sin escala). */
  height: {
    type: Number,
    required: true,
  },
})

const scrollEl = ref(null)
const scale = ref(1)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0, left: 0, top: 0 })

function clampScale(value) {
  return Math.min(2.5, Math.max(0.45, value))
}

function zoomIn() {
  scale.value = clampScale(scale.value + 0.1)
}

function zoomOut() {
  scale.value = clampScale(scale.value - 0.1)
}

function resetView() {
  scale.value = 1
  if (scrollEl.value) {
    scrollEl.value.scrollLeft = 0
    scrollEl.value.scrollTop = 0
  }
}

/**
 * Whether the scroller can still move along an axis in the delta direction.
 * @param {HTMLElement} el
 * @param {'x' | 'y'} axis
 * @param {number} delta
 * @returns {boolean}
 */
function canScroll(el, axis, delta) {
  if (delta === 0) return false
  if (axis === 'y') {
    const max = el.scrollHeight - el.clientHeight
    return delta < 0 ? el.scrollTop > 0 : el.scrollTop < max - 1
  }
  const max = el.scrollWidth - el.clientWidth
  return delta < 0 ? el.scrollLeft > 0 : el.scrollLeft < max - 1
}

function onWheel(event) {
  const el = scrollEl.value
  if (!el) return

  if (event.ctrlKey || event.metaKey) {
    if (!canScroll(el, 'x', event.deltaY)) return
    el.scrollLeft += event.deltaY
    event.preventDefault()
    return
  }

  const moveY = canScroll(el, 'y', event.deltaY)
  const moveX = canScroll(el, 'x', event.deltaX)
  if (!moveY && !moveX) return

  if (moveY) el.scrollTop += event.deltaY
  if (moveX) el.scrollLeft += event.deltaX
  event.preventDefault()
}

function isSlotHitTarget(event) {
  const target = event.target
  if (!target || typeof target.closest !== 'function') return false
  // role=button on selectable slots; class covers the same nodes if role is stripped.
  return Boolean(target.closest('[role="button"], .slot-selectable'))
}

function onPointerDown(event) {
  if (event.button !== 0 || !scrollEl.value) return
  if (isSlotHitTarget(event)) return
  isPanning.value = true
  panStart.value = {
    x: event.clientX,
    y: event.clientY,
    left: scrollEl.value.scrollLeft,
    top: scrollEl.value.scrollTop,
  }
  scrollEl.value.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event) {
  if (!isPanning.value || !scrollEl.value) return
  const dx = event.clientX - panStart.value.x
  const dy = event.clientY - panStart.value.y
  scrollEl.value.scrollLeft = panStart.value.left - dx
  scrollEl.value.scrollTop = panStart.value.top - dy
}

function onPointerUp(event) {
  if (!isPanning.value) return
  isPanning.value = false
  const el = scrollEl.value
  if (!el || typeof el.releasePointerCapture !== 'function') return
  try {
    el.releasePointerCapture(event.pointerId)
  } catch {
    // Capture may already be released by the user agent after pointerup/cancel.
  }
}
</script>
