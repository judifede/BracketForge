<template>
  <div class="rr-view">
    <section class="rr-standings">
      <h3 class="rr-section-title">Clasificación</h3>
      <StandingsTable :standings="standings" :columns="columns" :show-trophy="isComplete" />
    </section>

    <section class="rr-rounds">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="rr-section-title">Rondas</h3>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn--toolbar btn--ghost"
            :disabled="!canUndo"
            @click="$emit('apply-action', { type: 'undo-round' })"
          >
            Deshacer ronda
          </button>
          <button
            type="button"
            class="btn btn--toolbar btn--primary"
            :disabled="!canGenerate"
            @click="$emit('apply-action', { type: 'generate-round' })"
          >
            Generar ronda
          </button>
        </div>
      </div>

      <p v-if="!rounds.length" class="text-sm text-text-muted">
        Todavía no hay rondas. Genera la primera para empezar.
      </p>

      <div class="flex flex-col gap-3">
        <article
          v-for="(round, index) in rounds"
          :key="index"
          class="rr-round"
          :class="{ 'rr-round--complete': roundComplete(round) }"
        >
          <h4 class="rr-round-title">
            Ronda {{ index + 1 }}
            <span class="rr-round-progress">
              {{ round.filter((m) => m.played).length }}/{{ playable(round).length }}
            </span>
          </h4>
          <p
            v-if="rematchesByRound[index]?.length"
            class="rr-rematch-warning"
          >
            Revancha inevitable: {{ rematchesByRound[index].map((p) => `${p[0]} - ${p[1]}`).join(', ') }}
          </p>
          <ul class="flex flex-col gap-1.5">
            <li v-for="match in round" :key="match.id" class="rr-match">
              <span
                class="rr-match-name"
                :class="{ 'rr-match-name--winner': isWinner(match, match.p1) }"
              >
                {{ match.p1 }}
              </span>

              <span v-if="match.bye" class="text-xs text-text-muted">
                Descanso (+1)
              </span>
              <ScoreInput
                v-else
                :match-id="match.id"
                :p1="match.p1"
                :p2="match.p2"
                :score1="match.score1"
                :score2="match.score2"
                @apply-result="$emit('apply-result', $event)"
              />

              <span
                class="rr-match-name text-right"
                :class="{ 'rr-match-name--winner': isWinner(match, match.p2) }"
              >
                {{ match.p2 ?? '—' }}
              </span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ScoreInput from './ScoreInput.vue'
import StandingsTable from './StandingsTable.vue'
import { defaultSwissTotalRounds, swiss } from '../../lib/formats/swiss.js'

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
})

defineEmits(['apply-result', 'apply-action'])

const columns = [
  { key: 'played', label: 'PJ', title: 'Partidos jugados' },
  { key: 'won', label: 'G', title: 'Ganados' },
  { key: 'drawn', label: 'E', title: 'Empatados' },
  { key: 'lost', label: 'P', title: 'Perdidos' },
  { key: 'diff', label: 'Dif', title: 'Diferencia de goles' },
  { key: 'buchholz', label: 'Buch', title: 'Suma de los puntos de los rivales' },
  { key: 'sonneborn', label: 'SB', title: 'Suma de los puntos de los rivales vencidos' },
  { key: 'points', label: 'Pts', title: 'Puntos' },
]

const rounds = computed(() => swiss.getRounds(props.state))
const standings = computed(() => swiss.getStandings(props.state))

/** Revanchas inevitables por ronda (0-based). */
const rematchesByRound = computed(() => {
  const source = props.state?.rounds ?? []
  return source.map((_, index) => swiss.getRematches(props.state, index))
})

const totalRounds = computed(() => {
  const total = Number(props.state?.options?.totalRounds)
  if (Number.isInteger(total) && total > 0) return total
  return defaultSwissTotalRounds(props.state?.seeds?.length ?? 8)
})

const isComplete = computed(() => swiss.getProgress(props.state).complete)

const canGenerate = computed(() => {
  if (rounds.value.length >= totalRounds.value) return false
  const current = rounds.value[rounds.value.length - 1]
  if (!current) return true
  return current.every((match) => match.bye || match.played)
})

const canUndo = computed(() => rounds.value.length > 0)

/**
 * @param {object} round
 */
function playable(round) {
  return round.filter((match) => !match.bye)
}

/**
 * @param {object} round
 */
function roundComplete(round) {
  return playable(round).every((match) => match.played)
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
