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
        Doble eliminación: bracket de ganadores, bracket de perdedores y gran final.
      </title>

      <!-- Mismos rellenos que Brackets.vue: sin estos defs, url(#cbg-slot-*)
           deja el fill en none y los slots no reciben clics (SVG visiblePainted). -->
      <defs>
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
      </defs>

      <!-- Títulos de bloque -->
      <g v-for="section in layout.sections" :key="`section-${section.id}`">
        <text
          :x="section.x + 10"
          :y="section.y + 22"
          class="de-section-title"
        >
          {{ section.title.toUpperCase() }}
        </text>
      </g>

      <!-- Etiquetas de ronda -->
      <g
        v-for="(section, si) in layout.sections"
        :key="`labels-${section.id}`"
      >
        <g v-for="(column, ci) in section.columns" :key="`label-${si}-${ci}`">
          <text
            :x="column.x + slotWidth / 2"
            :y="section.y + labelBarY + labelBarHeight / 2 + 4"
            text-anchor="middle"
            class="round-label-text"
          >
            {{ column.label.toUpperCase() }}
          </text>
        </g>
      </g>

      <!-- Conectores -->
      <polyline
        v-for="(connector, ci) in layout.connectors"
        :key="`c-${ci}`"
        :points="connector.points"
        fill="none"
        class="bracket-connector"
        :class="{
          'bracket-connector--lit': connector.lit,
          'bracket-connector--drop': connector.kind === 'drop',
        }"
      />

      <!-- Partidos -->
      <g v-for="item in flatMatches" :key="item.match.id">
        <g role="group" :aria-label="matchAriaLabel(item.match)">
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
              {{ slotLabel(item.match, item.match.p1) }}
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
              {{ slotLabel(item.match, item.match.p2) }}
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
    </svg>
  </BracketViewport>
</template>

<script setup>
import { computed } from 'vue'
import BracketViewport from '../BracketViewport.vue'
import { LAYOUT } from '../../lib/layout/treeLayout.js'
import { computeDoubleEliminationLayout } from '../../lib/layout/doubleEliminationLayout.js'
import { doubleElimination } from '../../lib/formats/doubleElimination.js'

const props = defineProps({
  /** Estado del motor de doble eliminación. */
  state: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['apply-result'])

const titleId = 'double-elimination-svg-title'
const slotWidth = LAYOUT.slotWidth
const textPad = 12
const labelBarY = LAYOUT.paddingY + 4
const labelBarHeight = 22

const brackets = computed(() => doubleElimination.getBrackets(props.state))

const layout = computed(() => computeDoubleEliminationLayout(brackets.value))

const flatMatches = computed(() =>
  layout.value.sections.flatMap((section) =>
    section.columns.flatMap((column) =>
      column.matches.map((item) => ({ ...item, sectionId: section.id }))
    )
  )
)

function slotLabel(match, player) {
  if (player != null && player !== '') return player
  if (match.status === 'bye') return 'Descanso'
  return 'Por definir'
}

function isWinner(match, player) {
  return Boolean(match.winner && player && match.winner === player)
}

function isSelectable(match, player) {
  // Delegate to the engine so UI and applyResult stay in lockstep
  // (byes, pending feeders, winner correction).
  return doubleElimination.canPick(props.state, match.id, player)
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

function matchAriaLabel(match) {
  const a = slotLabel(match, match.p1)
  const b = slotLabel(match, match.p2)
  if (match.winner) return `${a} vs ${b}, ganador ${match.winner}`
  return `${a} vs ${b}`
}

function onSelect(match, player, event) {
  if (!isSelectable(match, player)) return
  emit('apply-result', { matchId: match.id, result: { winner: player } })
  if (event?.type === 'click') {
    event.currentTarget?.blur?.()
  }
}
</script>
