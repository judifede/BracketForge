<template>
  <div class="flex items-center gap-2">
    <input
      type="number"
      min="0"
      step="1"
      inputmode="numeric"
      class="rr-score"
      :aria-label="`Goles de ${p1}`"
      :value="score1 ?? ''"
      placeholder="–"
      @change="onChange($event, 1)"
      @keydown.enter.prevent="onChange($event, 1)"
    />
    <span class="text-white/50 text-sm">–</span>
    <input
      type="number"
      min="0"
      step="1"
      inputmode="numeric"
      class="rr-score"
      :aria-label="`Goles de ${p2}`"
      :value="score2 ?? ''"
      placeholder="–"
      @change="onChange($event, 2)"
      @keydown.enter.prevent="onChange($event, 2)"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  matchId: {
    type: String,
    required: true,
  },
  p1: {
    type: String,
    required: true,
  },
  p2: {
    type: String,
    required: true,
  },
  score1: {
    type: Number,
    default: null,
  },
  score2: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['apply-result'])

/**
 * @param {Event} event
 * @param {1|2} side
 */
function onChange(event, side) {
  const raw = event.target?.value
  // Vacío: no emitir. Así se puede rellenar un lado sin forzar 0-X
  // hasta tener un entero válido en el campo editado.
  if (raw === '') {
    event.target.value = props[side === 1 ? 'score1' : 'score2'] ?? ''
    return
  }
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    event.target.value = props[side === 1 ? 'score1' : 'score2'] ?? ''
    return
  }
  const a = side === 1 ? value : (props.score1 ?? 0)
  const b = side === 2 ? value : (props.score2 ?? 0)
  emit('apply-result', { matchId: props.matchId, result: { a, b } })
}
</script>
