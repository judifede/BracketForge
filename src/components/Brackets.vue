<template>
  <BracketViewport :width="layout.width" :height="layout.height">
    <svg
      :width="layout.width"
      :height="layout.height"
      role="img"
      :aria-labelledby="titleId"
      class="bracket-svg block"
    >
          <title :id="titleId">
            Clic en un rival para elegir o corregir el ganador.
          </title>

          <defs>
            <linearGradient id="cbg-trophy-cup" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fff1a0" />
              <stop offset="38%" stop-color="#f5c518" />
              <stop offset="100%" stop-color="#b8860b" />
            </linearGradient>
            <linearGradient id="cbg-trophy-rim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffe566" />
              <stop offset="100%" stop-color="#d4a017" />
            </linearGradient>
            <linearGradient id="cbg-trophy-stem" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#c4920a" />
              <stop offset="50%" stop-color="#f0d060" />
              <stop offset="100%" stop-color="#a67c00" />
            </linearGradient>
            <linearGradient id="cbg-trophy-base" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f5c518" />
              <stop offset="100%" stop-color="#8a6508" />
            </linearGradient>
            <linearGradient id="cbg-slot-idle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#24303a" />
              <stop offset="100%" stop-color="#1a2229" />
            </linearGradient>
            <linearGradient id="cbg-slot-pending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2a3a42" />
              <stop offset="100%" stop-color="#1e2a32" />
            </linearGradient>
            <linearGradient id="cbg-slot-winner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3a3420" />
              <stop offset="100%" stop-color="#2a2414" />
            </linearGradient>
            <linearGradient id="cbg-champ-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3d3420" />
              <stop offset="100%" stop-color="#231e12" />
            </linearGradient>
            <linearGradient id="cbg-label-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(45, 212, 191, 0.16)" />
              <stop offset="100%" stop-color="rgba(255, 255, 255, 0.05)" />
            </linearGradient>
          </defs>

          <g v-for="(round, ri) in layout.rounds" :key="`label-${ri}`">
            <rect
              :x="round.x"
              :y="labelBarY"
              :width="slotWidth"
              :height="labelBarHeight"
              rx="2"
              ry="2"
              class="round-label-bar"
              :class="{ 'round-label-bar--final': isFinalLabel(round.label) }"
            />
            <text
              :x="round.x + slotWidth / 2"
              :y="labelBarY + labelBarHeight / 2 + 4"
              text-anchor="middle"
              class="round-label-text"
              :class="{ 'round-label-text--final': isFinalLabel(round.label) }"
            >
              {{ formatRoundLabel(round.label) }}
            </text>
          </g>

          <g v-if="layout.championLabel">
            <rect
              :x="layout.championLabel.x"
              :y="labelBarY"
              :width="slotWidth"
              :height="labelBarHeight"
              rx="2"
              ry="2"
              class="round-label-bar round-label-bar--champion"
            />
            <text
              :x="layout.championLabel.x + slotWidth / 2"
              :y="labelBarY + labelBarHeight / 2 + 4"
              text-anchor="middle"
              class="round-label-text round-label-text--champion"
            >
              {{ formatRoundLabel(layout.championLabel.label) }}
            </text>
          </g>

          <polyline
            v-for="(connector, ci) in layout.connectors"
            :key="`c-${ci}`"
            :points="connector.points"
            fill="none"
            class="bracket-connector"
            :class="{ 'bracket-connector--lit': connector.lit }"
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
                @click="onSelect(item.match, item.match.p1, $event)"
                @keydown.enter.prevent="onSelect(item.match, item.match.p1, $event)"
                @keydown.space.prevent="onSelect(item.match, item.match.p1, $event)"
              >
                <rect
                  :x="item.slot1.x"
                  :y="item.slot1.y"
                  :width="item.slot1.width"
                  :height="item.slot1.height"
                  class="slot-rect"
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
                @click="onSelect(item.match, item.match.p2, $event)"
                @keydown.enter.prevent="onSelect(item.match, item.match.p2, $event)"
                @keydown.space.prevent="onSelect(item.match, item.match.p2, $event)"
              >
                <rect
                  :x="item.slot2.x"
                  :y="item.slot2.y"
                  :width="item.slot2.width"
                  :height="item.slot2.height"
                  class="slot-rect"
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

              <!-- After match-frame so the path overlaps the outgoing connector -->
              <polyline
                v-if="isWinner(item.match, item.match.p1)"
                :points="winnerFramePoints(item.slot1, 'top')"
                fill="none"
                class="winner-frame"
              />
              <polyline
                v-if="isWinner(item.match, item.match.p2)"
                :points="winnerFramePoints(item.slot2, 'bottom')"
                fill="none"
                class="winner-frame"
              />
            </g>
          </g>

          <g v-if="layout.championSlot" data-tour="bracket-champion-slot">
            <g
              :transform="`translate(${layout.trophy.x}, ${layout.trophy.y}) scale(${layout.trophy.size / 48})`"
              class="champion-trophy"
              :class="{ 'champion-trophy--lit': champion }"
              aria-hidden="true"
            >
              <!-- left handle -->
              <path
                d="M14 10c-5.2 0-8 3.2-8 7.2 0 3.4 2.1 5.6 5.4 6.2"
                fill="none"
                stroke="url(#cbg-trophy-rim)"
                stroke-width="3.2"
                stroke-linecap="round"
              />
              <!-- right handle -->
              <path
                d="M34 10c5.2 0 8 3.2 8 7.2 0 3.4-2.1 5.6-5.4 6.2"
                fill="none"
                stroke="url(#cbg-trophy-rim)"
                stroke-width="3.2"
                stroke-linecap="round"
              />
              <!-- cup body -->
              <path
                d="M15 6h18c.8 0 1.5.7 1.5 1.5V12c0 6.2-4.2 10.8-10.5 10.8S13.5 18.2 13.5 12V7.5C13.5 6.7 14.2 6 15 6z"
                fill="url(#cbg-trophy-cup)"
              />
              <!-- cup rim -->
              <rect x="13" y="5" width="22" height="4" rx="1.5" fill="url(#cbg-trophy-rim)" />
              <!-- shine -->
              <path
                d="M17.5 9.5c0 4.5 1.4 7.8 4 9.2"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                stroke-width="2"
                stroke-linecap="round"
              />
              <!-- neck -->
              <rect x="21.5" y="23" width="5" height="7" rx="1" fill="url(#cbg-trophy-stem)" />
              <!-- knop -->
              <ellipse cx="24" cy="31" rx="5.5" ry="2.4" fill="url(#cbg-trophy-rim)" />
              <!-- base tiers -->
              <rect x="17" y="33" width="14" height="3.2" rx="1" fill="url(#cbg-trophy-base)" />
              <rect x="14" y="37" width="20" height="4" rx="1.2" fill="url(#cbg-trophy-base)" />
              <rect x="12" y="41.5" width="24" height="3.5" rx="1.4" fill="url(#cbg-trophy-rim)" />
            </g>
            <rect
              :x="layout.championSlot.x"
              :y="layout.championSlot.y"
              :width="layout.championSlot.width"
              :height="layout.championSlot.height"
              rx="5"
              ry="5"
              class="champion-slot"
              :class="{ 'champion-slot--filled': champion }"
            />
            <rect
              :x="layout.championSlot.x + 3"
              :y="layout.championSlot.y + 3"
              :width="layout.championSlot.width - 6"
              :height="layout.championSlot.height - 6"
              rx="3"
              ry="3"
              class="champion-slot-inner"
              :class="{ 'champion-slot-inner--filled': champion }"
            />
            <text
              :x="layout.championSlot.x + textPad"
              :y="layout.championSlot.y + layout.championSlot.height / 2 + 5"
              font-size="14"
              class="champion-text"
              :class="{ 'champion-text--filled': champion }"
            >
              {{ champion || '—' }}
            </text>
          </g>
        </svg>
  </BracketViewport>
</template>

<script setup>
import { computed } from 'vue'
import BracketViewport from './BracketViewport.vue'
import { computeBracketLayout, LAYOUT } from '../lib/bracketLayout.js'
import { singleElimination } from '../lib/formats/singleElimination.js'
import { playerSlotLabel } from '../utils/slotLabel.js'

const props = defineProps({
  /** Estado del motor de eliminación simple (`{ seeds, rounds }`). */
  state: {
    type: Object,
    required: true,
  },
  tournamentName: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['apply-result'])

const titleId = 'bracket-svg-title'
const slotWidth = LAYOUT.slotWidth
const textPad = 12
const labelBarY = LAYOUT.paddingY + 4
const labelBarHeight = 22

/** Overlap past the slot edge so the frame meets the connector without a hairline gap. */
const WINNER_FRAME_EXIT_OVERLAP = 2

/**
 * Winner path through a slot: mid-left → outer edge → mid-right,
 * extending slightly past the right edge into the outgoing connector.
 * @param {{ x: number, y: number, width: number, height: number }} slot
 * @param {'top' | 'bottom'} side
 * @returns {string}
 */
function winnerFramePoints(slot, side) {
  const { x, y, width: w, height: h } = slot
  const midY = y + h / 2
  const exitX = x + w + WINNER_FRAME_EXIT_OVERLAP
  if (side === 'top') {
    // mid-left → top-left → top-right → mid-right (into connector)
    return `${x},${midY} ${x},${y} ${x + w},${y} ${x + w},${midY} ${exitX},${midY}`
  }
  // mid-left → bottom-left → bottom-right → mid-right (into connector)
  return `${x},${midY} ${x},${y + h} ${x + w},${y + h} ${x + w},${midY} ${exitX},${midY}`
}

const layout = computed(() => computeBracketLayout(props.state))

const flatMatches = computed(() =>
  layout.value.rounds.flatMap((round, roundIndex) =>
    round.matches.map((item) => ({ ...item, roundIndex }))
  )
)

const champion = computed(() => {
  const rounds = props.state.rounds
  if (!rounds?.length) return null
  return rounds[rounds.length - 1][0]?.winner ?? null
})

function formatRoundLabel(label) {
  return String(label || '').toUpperCase()
}

function isFinalLabel(label) {
  return String(label || '').toLowerCase() === 'final'
}

function isWinner(match, player) {
  return Boolean(match.winner && player && match.winner === player)
}

function isSelectable(match, player) {
  return singleElimination.canPick(props.state, match.id, player)
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

function onSelect(match, player, event) {
  if (!isSelectable(match, player)) return
  emit('apply-result', { matchId: match.id, result: { winner: player } })
  // Mouse/touch click: drop focus so Chromium does not leave a white SVG ring.
  if (event?.type === 'click') {
    event.currentTarget?.blur?.()
  }
}

</script>

