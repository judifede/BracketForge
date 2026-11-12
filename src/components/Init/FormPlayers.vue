<template>
  <div class="flex flex-col gap-1 text-left players-field">
    <div class="flex items-center justify-between gap-2">
      <label :for="id" class="!justify-start text-sm font-medium text-white/80">
        Participantes
      </label>
      <button
        type="button"
        class="expand-btn"
        :aria-pressed="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Compactar' : 'Ampliar' }}
      </button>
    </div>
    <textarea
      placeholder="Uno por línea o separados por coma"
      class="players-textarea box w-full max-w-[370px] text-white"
      :class="{ 'players-textarea--expanded': expanded, 'no-valid': showError }"
      :id="id"
      :name="name"
      :value="players"
      :data-tour="$attrs['data-tour']"
      @input="handleInput"
      @blur="markTouched"
      :aria-invalid="showError"
      :aria-describedby="describedBy"
    ></textarea>

    <p
      v-if="previewCount > 0"
      class="text-sm text-white/80"
      :id="countId"
    >
      {{ previewCount }} participante{{ previewCount === 1 ? '' : 's' }}
      <span v-if="previewNames" class="text-white/80"> — {{ previewNames }}</span>
    </p>

    <div
      v-if="showError"
      :id="errorId"
      class="error-message mt-1"
      role="alert"
    >
      {{ validation.error || 'Revisa la lista de participantes.' }}
    </div>
    <div
      v-else-if="showDuplicateHint"
      class="text-sm text-orange-300/90 mt-1"
      role="status"
    >
      Se omitirán nombres duplicados.
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  parsePlayers,
  validatePlayersInput,
} from '../../utils/players.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  players: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  /** Force showing errors (e.g. parent form submitted). */
  forceShowErrors: {
    type: Boolean,
    default: false,
  },
  minPlayers: {
    type: Number,
    default: 2,
  },
})

const emit = defineEmits(['update:players', 'isTextAreaValid', 'validation'])

const touched = ref(false)
const expanded = ref(false)
const errorId = computed(() => `${props.id}-error`)
const countId = computed(() => `${props.id}-count`)

const validation = computed(() =>
  validatePlayersInput(props.players, { min: props.minPlayers })
)

const previewPlayers = computed(() => parsePlayers(props.players))
const previewCount = computed(() => previewPlayers.value.length)
const previewNames = computed(() => {
  const list = previewPlayers.value
  if (list.length === 0) return ''
  if (list.length <= 4) return list.join(', ')
  return `${list.slice(0, 3).join(', ')}…`
})

const showError = computed(
  () => (touched.value || props.forceShowErrors) && !validation.value.ok
)

const showDuplicateHint = computed(
  () =>
    validation.value.ok &&
    validation.value.hadDuplicates &&
    (touched.value || props.forceShowErrors || previewCount.value > 0)
)

const describedBy = computed(() => {
  const ids = []
  if (previewCount.value > 0) ids.push(countId.value)
  if (showError.value) ids.push(errorId.value)
  return ids.length ? ids.join(' ') : undefined
})

function emitValidity() {
  emit('isTextAreaValid', validation.value.ok)
  emit('validation', validation.value)
}

watch(
  validation,
  () => {
    emitValidity()
  },
  { immediate: true }
)

const markTouched = () => {
  touched.value = true
}

const handleInput = (event) => {
  emit('update:players', event.target.value)
}

defineExpose({
  markTouched,
  validation,
})
</script>

<style scoped>
.players-textarea {
  min-height: 160px;
  max-height: 220px;
  overflow-y: auto;
  field-sizing: auto;
  background-color: var(--bg-slot);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  resize: vertical;
  transition: min-height 0.2s ease, max-height 0.2s ease;
}

.players-textarea--expanded {
  min-height: 280px;
  max-height: 420px;
}

.expand-btn {
  border: 1px solid var(--border-muted);
  border-radius: 4px;
  padding: 0.15rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color 0.15s ease, border-color 0.15s ease;
}

.expand-btn:hover {
  color: var(--accent-live);
  border-color: color-mix(in srgb, var(--accent-live) 45%, transparent);
}
</style>
