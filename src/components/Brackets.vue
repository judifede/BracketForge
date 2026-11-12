<template>
  <div class="bracket-scroll-wrap relative w-full max-w-full" data-tour="bracket-viewport">
    <div class="zoom-controls" data-tour="bracket-zoom">
      <button type="button" class="zoom-btn" aria-label="Alejar" @click="zoomOut">−</button>
      <span class="zoom-label">{{ Math.round(scale * 100) }}%</span>
      <button type="button" class="zoom-btn" aria-label="Acercar" @click="zoomIn">+</button>
      <button type="button" class="zoom-btn zoom-btn--wide" @click="resetView">Reset</button>
    </div>

    <div
      ref="scrollEl"
      class="bracket-scroll w-full max-w-full overflow-auto"
      :class="{ 'is-panning': isPanning }"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @scroll.passive="onBracketScroll"
    >
      <div
        class="bracket-transform"
        :style="{ transform: `scale(${scale})`, transformOrigin: '0 0' }"
      >
        <svg
          ref="svgEl"
          :width="layout.width"
          :height="layout.height"
          role="img"
          :aria-labelledby="titleId"
          class="bracket-svg block"
        >
          <title :id="titleId">
            Bracket de {{ tournamentName || 'competición' }}
          </title>

          <g v-for="(round, ri) in layout.rounds" :key="`label-${ri}`">
            <rect
              :x="round.x"
              :y="labelBarY"
              :width="slotWidth"
              :height="labelBarHeight"
              rx="2"
              ry="2"
              class="round-label-bar"
            />
            <text
              :x="round.x + slotWidth / 2"
              :y="labelBarY + labelBarHeight / 2 + 4"
              text-anchor="middle"
              class="round-label-text"
            >
              {{ formatRoundLabel(round.label) }}
            </text>
          </g>

          <polyline
            v-for="(connector, ci) in layout.connectors"
            :key="`c-${ci}`"
            :points="connector.points"
            fill="none"
            class="bracket-connector"
          />

          <g v-for="item in flatMatches" :key="item.match.id">
            <g role="group" :aria-label="matchAriaLabel(item.match, item.roundIndex)">
              <g
                :class="slotClass(item.match, item.match.p1)"
                :tabindex="isSelectable(item.match, item.match.p1) ? 0 : -1"
                :role="isSelectable(item.match, item.match.p1) ? 'button' : null"
                :aria-label="
                  isSelectable(item.match, item.match.p1)
                    ? `Elegir ganador: ${item.match.p1}`
                    : null
                "
                @click="onSelect(item.match, item.match.p1)"
                @keydown.enter.prevent="onSelect(item.match, item.match.p1)"
                @keydown.space.prevent="onSelect(item.match, item.match.p1)"
              >
                <rect
                  :x="item.slot1.x"
                  :y="item.slot1.y"
                  :width="item.slot1.width"
                  :height="item.slot1.height"
                  class="slot-rect"
                />
                <rect
                  v-if="isWinner(item.match, item.match.p1)"
                  :x="item.slot1.x"
                  :y="item.slot1.y"
                  :width="winBarWidth"
                  :height="item.slot1.height"
                  class="win-bar"
                />
                <text
                  :x="item.slot1.x + textPad"
                  :y="item.slot1.y + item.slot1.height / 2 + 4"
                  font-size="13"
                  class="slot-text"
                >
                  {{ playerSlotLabel(item.match.p1, item.roundIndex) }}
                </text>
              </g>

              <line
                :x1="item.frame.x + 1"
                :y1="item.slot1.y + item.slot1.height"
                :x2="item.frame.x + item.frame.width - 1"
                :y2="item.slot1.y + item.slot1.height"
                class="slot-divider"
              />

              <g
                :class="slotClass(item.match, item.match.p2)"
                :tabindex="isSelectable(item.match, item.match.p2) ? 0 : -1"
                :role="isSelectable(item.match, item.match.p2) ? 'button' : null"
                :aria-label="
                  isSelectable(item.match, item.match.p2)
                    ? `Elegir ganador: ${item.match.p2}`
                    : null
                "
                @click="onSelect(item.match, item.match.p2)"
                @keydown.enter.prevent="onSelect(item.match, item.match.p2)"
                @keydown.space.prevent="onSelect(item.match, item.match.p2)"
              >
                <rect
                  :x="item.slot2.x"
                  :y="item.slot2.y"
                  :width="item.slot2.width"
                  :height="item.slot2.height"
                  class="slot-rect"
                />
                <rect
                  v-if="isWinner(item.match, item.match.p2)"
                  :x="item.slot2.x"
                  :y="item.slot2.y"
                  :width="winBarWidth"
                  :height="item.slot2.height"
                  class="win-bar"
                />
                <text
                  :x="item.slot2.x + textPad"
                  :y="item.slot2.y + item.slot2.height / 2 + 4"
                  font-size="13"
                  class="slot-text"
                >
                  {{ playerSlotLabel(item.match.p2, item.roundIndex) }}
                </text>
              </g>

              <rect
                :x="item.frame.x"
                :y="item.frame.y"
                :width="item.frame.width"
                :height="item.frame.height"
                rx="3"
                ry="3"
                class="match-frame"
              />
            </g>
          </g>

          <g v-if="layout.championSlot" data-tour="bracket-champion-slot">
            <g
              :transform="`translate(${layout.trophy.x}, ${layout.trophy.y})`"
              class="champion-trophy"
              :class="{ 'champion-trophy--lit': champion }"
              aria-hidden="true"
            >
              <path
                :transform="`scale(${layout.trophy.size / 24})`"
                d="M8 3h8v2h2a2 2 0 0 1 2 2v1a5 5 0 0 1-4.1 4.9A5 5 0 0 1 13 16.9V19h3v2H8v-2h3v-2.1A5 5 0 0 1 6.1 12.9 5 5 0 0 1 2 8V7a2 2 0 0 1 2-2h2V3zm2 2v2H4v1a3 3 0 0 0 3 3h1V5h2zm4 0h2v4h1a3 3 0 0 0 3-3V7h-6V5z"
              />
            </g>
            <rect
              :x="layout.championSlot.x"
              :y="layout.championSlot.y"
              :width="layout.championSlot.width"
              :height="layout.championSlot.height"
              rx="3"
              ry="3"
              class="champion-slot"
              :class="{ 'champion-slot--filled': champion }"
            />
            <rect
              v-if="champion"
              :x="layout.championSlot.x"
              :y="layout.championSlot.y"
              :width="winBarWidth"
              :height="layout.championSlot.height"
              class="win-bar"
            />
            <text
              :x="layout.championSlot.x + textPad"
              :y="layout.championSlot.y + layout.championSlot.height / 2 + 4"
              font-size="13"
              class="champion-text"
              :class="{ 'champion-text--filled': champion }"
            >
              {{ champion || 'Campeón' }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <p
      v-if="showScrollHint"
      class="scroll-hint"
      role="status"
      aria-live="polite"
    >
      Arrastra o usa la rueda <span aria-hidden="true">↔</span>
      <span class="sr-only"> para mover y hacer zoom en el bracket</span>
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { computeBracketLayout, LAYOUT } from '../lib/bracketLayout.js'
import { playerSlotLabel } from '../utils/slotLabel.js'
import { exportSvgAsPng } from '../lib/exportBracketPng.js'

const props = defineProps({
  bracket: {
    type: Object,
    required: true,
  },
  tournamentName: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-winner'])

const titleId = 'bracket-svg-title'
const slotWidth = LAYOUT.slotWidth
const winBarWidth = LAYOUT.winBarWidth
const textPad = 12
const labelBarY = LAYOUT.paddingY + 4
const labelBarHeight = 22

const scrollEl = ref(null)
const svgEl = ref(null)
const hasOverflow = ref(false)
const hintDismissed = ref(false)
const scale = ref(1)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0, left: 0, top: 0 })

const showScrollHint = computed(
  () => hasOverflow.value && !hintDismissed.value
)

function checkOverflow() {
  const el = scrollEl.value
  if (!el) {
    hasOverflow.value = false
    return
  }
  const overflowing =
    el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
  hasOverflow.value = overflowing || scale.value !== 1
  if (!overflowing && scale.value === 1) {
    hintDismissed.value = false
  }
}

function onBracketScroll() {
  const el = scrollEl.value
  if (!el) return
  if (el.scrollLeft > 2 || el.scrollTop > 2) {
    hintDismissed.value = true
  }
}

function clampScale(value) {
  return Math.min(2.5, Math.max(0.45, value))
}

function zoomIn() {
  scale.value = clampScale(scale.value + 0.1)
  hintDismissed.value = true
}

function zoomOut() {
  scale.value = clampScale(scale.value - 0.1)
  hintDismissed.value = true
}

function resetView() {
  scale.value = 1
  if (scrollEl.value) {
    scrollEl.value.scrollLeft = 0
    scrollEl.value.scrollTop = 0
  }
}

function onWheel(event) {
  if (event.ctrlKey || event.metaKey) {
    const delta = event.deltaY > 0 ? -0.08 : 0.08
    scale.value = clampScale(scale.value + delta)
    hintDismissed.value = true
    return
  }
  if (!scrollEl.value) return
  scrollEl.value.scrollLeft += event.deltaY
  hintDismissed.value = true
}

function onPointerDown(event) {
  if (event.button !== 0 || !scrollEl.value) return
  if (event.target.closest('[role="button"]')) return
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
  hintDismissed.value = true
}

function onPointerUp(event) {
  if (!isPanning.value) return
  isPanning.value = false
  scrollEl.value?.releasePointerCapture?.(event.pointerId)
}

let resizeObserver = null

onMounted(() => {
  const el = scrollEl.value
  if (!el || typeof ResizeObserver === 'undefined') {
    checkOverflow()
    return
  }
  resizeObserver = new ResizeObserver(() => {
    checkOverflow()
  })
  resizeObserver.observe(el)
  checkOverflow()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

const layout = computed(() => computeBracketLayout(props.bracket))

watch(
  () => [layout.value.width, scale.value],
  async () => {
    await nextTick()
    checkOverflow()
  }
)

const flatMatches = computed(() =>
  layout.value.rounds.flatMap((round, roundIndex) =>
    round.matches.map((item) => ({ ...item, roundIndex }))
  )
)

const champion = computed(() => {
  const rounds = props.bracket.rounds
  if (!rounds?.length) return null
  return rounds[rounds.length - 1][0]?.winner ?? null
})

function formatRoundLabel(label) {
  return String(label || '').toUpperCase()
}

function isWinner(match, player) {
  return Boolean(match.winner && player && match.winner === player)
}

function isSelectable(match, player) {
  if (!player || !match.p1 || !match.p2) return false
  return match.winner !== player
}

function slotClass(match, player) {
  const empty = player == null
  const winner = isWinner(match, player)
  const isLoser = Boolean(match.winner && player && match.winner !== player)
  const pending = !empty && !match.winner && match.p1 && match.p2
  const selectable = isSelectable(match, player)

  return {
    'slot-empty': empty,
    'slot-winner': winner,
    'slot-loser': isLoser,
    'slot-pending': pending,
    'slot-selectable': selectable,
    'cursor-pointer': selectable,
  }
}

function matchAriaLabel(match, roundIndex) {
  const a = playerSlotLabel(match.p1, roundIndex)
  const b = playerSlotLabel(match.p2, roundIndex)
  if (match.winner) return `${a} vs ${b}, ganador ${match.winner}`
  return `${a} vs ${b}`
}

function onSelect(match, player) {
  if (!isSelectable(match, player)) return
  emit('select-winner', { matchId: match.id, winner: player })
}

async function exportPng(filename) {
  if (!svgEl.value) throw new Error('SVG no disponible')
  await exportSvgAsPng(svgEl.value, filename)
}

defineExpose({ exportPng, resetView })
</script>

<style scoped>
.bracket-scroll {
  scrollbar-color: rgba(45, 212, 191, 0.35) transparent;
  max-height: min(70vh, 820px);
  cursor: grab;
  touch-action: none;
}

.bracket-scroll.is-panning {
  cursor: grabbing;
}

.bracket-transform {
  width: max-content;
  transition: transform 0.12s ease-out;
}

.zoom-controls {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: rgba(11, 17, 22, 0.9);
}

.zoom-btn {
  min-width: 1.7rem;
  height: 1.7rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--accent-live);
  font-weight: 700;
  line-height: 1;
}

.zoom-btn:hover {
  border-color: var(--accent-live);
  background: color-mix(in srgb, var(--accent-live) 12%, transparent);
}

.zoom-btn--wide {
  padding: 0 0.45rem;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.zoom-label {
  min-width: 2.6rem;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

.scroll-hint {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  margin: 0;
  padding: 0.3rem 0.55rem;
  pointer-events: none;
  border-radius: 4px;
  border: 1px solid rgba(45, 212, 191, 0.35);
  background: rgba(11, 17, 22, 0.88);
  color: var(--accent-live, #2dd4bf);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  animation: scroll-hint-fade 0.35s ease-out;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes scroll-hint-fade {
  from {
    opacity: 0;
    transform: translateX(0.35rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.round-label-bar {
  fill: rgba(255, 255, 255, 0.1);
}

.round-label-text {
  fill: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  pointer-events: none;
}

.bracket-connector {
  stroke: rgba(255, 255, 255, 0.22);
  stroke-width: 2;
  stroke-linejoin: miter;
  stroke-linecap: square;
}

.match-frame {
  fill: none;
  stroke: #262626;
  stroke-width: 1;
  pointer-events: none;
}

.slot-rect {
  fill: #1c1c1c;
  stroke: none;
  transition:
    fill 0.15s ease,
    opacity 0.15s ease;
}

.slot-divider {
  stroke: #262626;
  stroke-width: 1;
  pointer-events: none;
}

.slot-text {
  fill: #f5f5f5;
  pointer-events: none;
}

.win-bar {
  fill: var(--accent-win, #f5c518);
  pointer-events: none;
}

.slot-empty .slot-rect {
  fill: #161616;
}

.slot-empty .slot-text {
  fill: rgba(255, 255, 255, 0.8);
}

.slot-pending .slot-rect {
  fill: #1f2428;
}

.slot-selectable:hover .slot-rect,
.slot-selectable:focus .slot-rect {
  fill: #243038;
}

.slot-selectable:hover .slot-text,
.slot-selectable:focus .slot-text {
  fill: var(--accent-live, #2dd4bf);
}

.slot-winner .slot-rect {
  fill: #222018;
}

.slot-winner .slot-text {
  fill: #fff8e1;
  font-weight: 600;
}

.slot-loser {
  opacity: 0.42;
}

.slot-loser .slot-text {
  fill: rgba(255, 255, 255, 0.8);
}

.slot-selectable:focus {
  outline: none;
}

.slot-selectable:focus .slot-rect {
  stroke: var(--accent-live, #2dd4bf);
  stroke-width: 1.5;
}

.champion-trophy {
  fill: var(--accent-win, #f5c518);
  transition: filter 0.25s ease;
}

.champion-trophy--lit {
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent-win) 55%, transparent));
}

.champion-slot {
  fill: #1c1c1c;
  stroke: #333;
  stroke-width: 1;
}

.champion-slot--filled {
  fill: #222018;
  stroke: var(--accent-win, #f5c518);
  stroke-width: 1.5;
}

.champion-text {
  fill: rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.champion-text--filled {
  fill: var(--accent-win, #f5c518);
  font-weight: 600;
}
</style>
