<template>
  <div class="rr-view">
    <section class="rr-standings">
      <h3 class="rr-section-title">Clasificación</h3>
      <StandingsTable :standings="standings" :show-trophy="isComplete" />
    </section>

    <section class="rr-rounds">
      <h3 class="rr-section-title">Jornadas</h3>
      <div class="rr-rounds-grid">
        <article
          v-for="(round, index) in schedule"
          :key="index"
          class="rr-round"
          :class="{ 'rr-round--complete': roundComplete(round) }"
        >
          <h4 class="rr-round-title">
            <button
              type="button"
              class="rr-round-toggle"
              :aria-expanded="!isCollapsed(index)"
              @click="toggleRound(index)"
            >
              <span
                class="rr-round-caret"
                :class="{ 'rr-round-caret--open': !isCollapsed(index) }"
                aria-hidden="true"
                >▸</span
              >
              Jornada {{ index + 1 }}
            </button>
            <span class="rr-round-progress">
              {{ round.filter((m) => m.played).length }}/{{ round.length }}
            </span>
          </h4>
          <ul v-show="!isCollapsed(index)" class="rr-round-matches">
            <li
              v-for="match in round"
              :key="match.id"
              class="rr-match"
            >
              <span class="rr-match-name" :class="{ 'rr-match-name--winner': isWinner(match, match.p1) }">
                {{ match.p1 }}
              </span>
              <ScoreInput
                :match-id="match.id"
                :p1="match.p1"
                :p2="match.p2"
                :score1="match.score1"
                :score2="match.score2"
                @apply-result="$emit('apply-result', $event)"
              />
              <span class="rr-match-name text-right" :class="{ 'rr-match-name--winner': isWinner(match, match.p2) }">
                {{ match.p2 }}
              </span>
            </li>
            <li
              v-for="name in byePlayers(round)"
              :key="`bye-${index}-${name}`"
              class="rr-match"
            >
              <span class="rr-match-name">{{ name }}</span>
              <span class="text-xs text-text-muted">Descanso</span>
              <span class="rr-match-name text-right text-text-muted">—</span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ScoreInput from './ScoreInput.vue'
import StandingsTable from './StandingsTable.vue'
import { roundRobin } from '../../lib/formats/roundRobin.js'

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
})

defineEmits(['apply-result'])

const schedule = computed(() => roundRobin.getSchedule(props.state))
const standings = computed(() => roundRobin.getStandings(props.state))
const isComplete = computed(() => roundRobin.getProgress(props.state).complete)

/** Jornadas plegadas por el usuario. */
const collapsed = ref(new Set())

/**
 * @param {number} index
 */
function isCollapsed(index) {
  return collapsed.value.has(index)
}

/**
 * @param {number} index
 */
function toggleRound(index) {
  const next = new Set(collapsed.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  collapsed.value = next
}

/**
 * @param {object} round
 */
function roundComplete(round) {
  return round.every((match) => match.played)
}

/**
 * Con campo impar el círculo deja a un participante fuera de la jornada.
 * @param {Array<{ p1: string, p2: string }>} round
 * @returns {string[]}
 */
function byePlayers(round) {
  const playing = new Set(
    round.flatMap((match) => [match.p1, match.p2].filter(Boolean))
  )
  return (props.state?.seeds ?? []).filter((name) => !playing.has(name))
}

/**
 * @param {object} match
 * @param {string} player
 */
function isWinner(match, player) {
  if (!match.played) return false
  if (match.score1 === match.score2) return false
  return match.score1 > match.score2 ? player === match.p1 : player === match.p2
}
</script>
