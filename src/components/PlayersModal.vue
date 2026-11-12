<template>
  <vue-final-modal
    v-model="isOpen"
    class="players-modal-host flex items-center justify-center"
    content-class="players-modal-content"
    overlay-class="players-modal-overlay"
    :click-to-close="true"
    :esc-to-close="true"
    :focus-trap="true"
  >
    <div
      class="modal-panel relative flex flex-col gap-6 px-8 py-8 min-w-[320px] max-w-[min(92vw,420px)]"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <h2 :id="titleId" class="text-xl font-bold text-left">{{ title }}</h2>
      <p class="text-sm text-white/75 text-left -mt-3">
        Actualizar la lista reinicia el progreso del bracket.
      </p>

      <FormPlayers
        id="modal-players"
        name="players"
        v-model:players="playersText"
        :force-show-errors="attempted"
        @isTextAreaValid="handleIsTextAreaValid"
        @validation="handleValidation"
      />

      <button
        type="button"
        class="absolute right-3 top-2 p-1 text-white hover:text-[var(--accent-brand)]"
        aria-label="Cerrar"
        @click="closeModal"
      >
        <Close additionalClasses="block" />
      </button>

      <button
        type="button"
        class="update-btn"
        :disabled="!canSubmit"
        @click="setUpdatePlayers"
      >
        Actualizar
      </button>
    </div>
  </vue-final-modal>
</template>

<script setup>
import FormPlayers from './Init/FormPlayers.vue'
import Close from '../assets/Close.vue'
import {
  canSubmitPlayersUpdate,
  serializePlayers,
  validatePlayersInput,
} from '../utils/formValidation.js'

import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'

const props = defineProps({
  showModal: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  players: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:showModal', 'close', 'update-players'])

const titleId = 'players-modal-title'
const playersText = ref(serializePlayers(props.players))
const textAreaValid = ref(props.players.length >= 2)
const attempted = ref(false)
const playersValidation = ref(null)

watch(
  () => [props.showModal, props.players],
  ([open]) => {
    if (open) {
      playersText.value = serializePlayers(props.players)
      textAreaValid.value = props.players.length >= 2
      attempted.value = false
    }
  }
)

const handleIsTextAreaValid = (state) => {
  textAreaValid.value = state
}

const handleValidation = (result) => {
  playersValidation.value = result
}

const canSubmit = computed(
  () => textAreaValid.value && canSubmitPlayersUpdate(playersText.value)
)

const setUpdatePlayers = () => {
  attempted.value = true
  const next = validatePlayersInput(playersText.value)
  if (!next.ok) {
    toast.error(next.error || 'Se necesitan al menos 2 jugadores')
    return
  }

  const confirmed = window.confirm(
    'Actualizar los jugadores reinicia todo el progreso del bracket. ¿Continuar?'
  )
  if (!confirmed) return

  if (next.hadDuplicates) {
    toast.info('Se omitieron nombres duplicados.')
  }
  emit('update-players', next.players)
  toast.info('Jugadores actualizados')
  closeModal()
}

const isOpen = computed({
  get: () => props.showModal,
  set: (value) => emit('update:showModal', value),
})

const closeModal = () => {
  isOpen.value = false
  attempted.value = false
  emit('close')
}
</script>

<style scoped>
.modal-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}

.update-btn {
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--accent-win) 55%, transparent);
  background: color-mix(in srgb, var(--bg-slot) 80%, #1a1a1a);
  color: var(--accent-win);
  padding: 0.55rem 1rem;
  font-weight: 600;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;
}

.update-btn:hover:enabled {
  background: color-mix(in srgb, var(--accent-win) 12%, transparent);
  border-color: var(--accent-win);
}

.update-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  color: rgba(255, 255, 255, 0.5);
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--bg-slot) 70%, #64748b);
}
</style>

<style>
.players-modal-overlay {
  background: rgba(5, 8, 12, 0.72) !important;
  backdrop-filter: blur(2px);
}

.players-modal-content {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
