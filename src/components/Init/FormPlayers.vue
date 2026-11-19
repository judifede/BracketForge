<template>
  <div class="flex flex-col gap-1 text-left players-field">
    <div class="flex flex-col items-start gap-[0.4rem]">
      <label :for="inputId" class="!justify-start !w-auto text-sm font-medium text-white">
        Participantes
      </label>
      <div
        class="inline-flex flex-wrap gap-[0.3rem]"
        role="group"
        aria-label="Cantidad de participantes"
      >
        <button
          v-for="size in SIZES"
          :key="size"
          type="button"
          class="chip"
          :class="{ 'chip--active': targetSize === size }"
          :aria-pressed="targetSize === size"
          @click="setTargetSize(size)"
        >
          {{ size }}
        </button>
      </div>
    </div>

    <div
      class="grid w-full max-w-[320px] grid-cols-1 gap-[0.45rem] min-[380px]:grid-cols-2"
      :data-tour="$attrs['data-tour']"
    >
      <label
        v-for="(slot, index) in slotValues"
        :key="index"
        class="!justify-start flex flex-col !items-stretch gap-[0.2rem]"
      >
        <span class="text-[0.7rem] font-semibold uppercase tracking-wide text-text-muted">
          Jugador {{ index + 1 }}
        </span>
        <input
          :id="index === 0 ? inputId : undefined"
          class="box w-full rounded-md border border-subtle px-[0.55rem] py-[0.4rem] text-white"
          :class="{ 'bg-slot': !String(slot).trim() }"
          type="text"
          :value="slot"
          :name="index === 0 ? name : undefined"
          autocomplete="off"
          :aria-invalid="showError && index === 0"
          :aria-describedby="index === 0 ? describedBy : undefined"
          @input="onSlotInput(index, $event.target.value)"
          @blur="onSlotBlur(index)"
        />
      </label>
    </div>

    <p
      v-if="previewCount > 0 || targetSize > 0"
      class="text-sm"
      :class="cupoCountClass"
      :id="countId"
    >
      {{ previewCount }} / {{ targetSize }} participante{{ targetSize === 1 ? '' : 's' }}
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
  serializePlayers,
  validatePlayersInput,
  normalizeName,
} from '../../utils/players.js'
import capitalize from '../../utils/utils.js'
import { SIZES } from '../../data/formPresets.js'

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
  /** Number of fixed slots from 4/8/16 chips. */
  targetSize: {
    type: Number,
    default: 8,
  },
})

const emit = defineEmits([
  'update:players',
  'update:targetSize',
  'isTextAreaValid',
  'validation',
])

function setTargetSize(size) {
  if (size === props.targetSize) return
  emit('update:targetSize', size)
}

const touched = ref(false)
const slotValues = ref([])

const errorId = computed(() => `${props.id}-error`)
const countId = computed(() => `${props.id}-count`)
const inputId = computed(() => props.id)

const validation = computed(() =>
  validatePlayersInput(props.players, { min: props.minPlayers })
)

const previewPlayers = computed(() => parsePlayers(props.players))
const previewCount = computed(() => previewPlayers.value.length)

const showError = computed(
  () => (touched.value || props.forceShowErrors) && !validation.value.ok
)

const showDuplicateHint = computed(
  () =>
    validation.value.ok &&
    validation.value.hadDuplicates &&
    (touched.value || props.forceShowErrors || previewCount.value > 0)
)

const cupoCountClass = computed(() => {
  if (previewCount.value === props.targetSize) return 'text-live'
  return 'text-white/80'
})

const describedBy = computed(() => {
  const ids = []
  if (previewCount.value > 0 || props.targetSize > 0) ids.push(countId.value)
  if (showError.value) ids.push(errorId.value)
  return ids.length ? ids.join(' ') : undefined
})

function emitPlayers(list) {
  emit('update:players', serializePlayers(list))
}

function emitValidity() {
  emit('isTextAreaValid', validation.value.ok)
  emit('validation', validation.value)
}

function syncSlotsFromPlayers() {
  const parsed = parsePlayers(props.players)
  slotValues.value = Array.from(
    { length: props.targetSize },
    (_, i) => parsed[i] || ''
  )
}

function commitSlots() {
  const names = slotValues.value.map((slot) => capitalize(slot)).filter(Boolean)
  emitPlayers(names)
}

watch(
  validation,
  () => {
    emitValidity()
  },
  { immediate: true }
)

watch(
  () => props.targetSize,
  () => {
    syncSlotsFromPlayers()
    commitSlots()
  },
  { immediate: true }
)

watch(
  () => props.players,
  (text) => {
    const fromSlots = serializePlayers(
      slotValues.value.map(normalizeName).filter(Boolean)
    )
    if (text !== fromSlots) syncSlotsFromPlayers()
  }
)

const markTouched = () => {
  touched.value = true
}

function onSlotInput(index, value) {
  const next = [...slotValues.value]
  next[index] = value
  slotValues.value = next
  commitSlots()
}

function onSlotBlur(index) {
  markTouched()
  const current = slotValues.value[index] ?? ''
  const capped = capitalize(current)
  if (!capped || capped === current) return
  const next = [...slotValues.value]
  next[index] = capped
  slotValues.value = next
  commitSlots()
}

defineExpose({
  markTouched,
  validation,
})
</script>
