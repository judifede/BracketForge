<template>
  <vue-final-modal
    v-model="isOpen"
    class="players-modal-host flex items-center justify-center"
    content-class="modal-content-center"
    overlay-class="modal-overlay"
    :click-to-close="true"
    :esc-to-close="true"
    :focus-trap="true"
  >
    <div
      class="panel relative flex flex-col gap-6 px-8 py-8 min-w-[320px] max-w-[min(92vw,420px)]"
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
        v-model:target-size="modalTargetSize"
        :force-show-errors="attempted"
        @isTextAreaValid="handleIsTextAreaValid"
        @validation="handleValidation"
      />

      <button
        type="button"
        class="absolute right-3 top-2 p-1 text-white hover:text-brand"
        aria-label="Cerrar"
        @click="closeModal"
      >
        <Close additionalClasses="block" />
      </button>

      <button
        type="button"
        class="btn btn--primary py-[0.55rem]"
        :disabled="!canSubmit"
        @click="setUpdatePlayers"
      >
        Actualizar
      </button>
    </div>
  </vue-final-modal>

  <ConfirmModal
    v-model="isConfirmVisible"
    title="Actualizar jugadores"
    message="Actualizar los jugadores reinicia todo el progreso del bracket. ¿Continuar?"
    @confirm="confirmUpdatePlayers"
    @cancel="pendingUpdate = null"
  />
</template>

<script setup>
import FormPlayers from './Init/FormPlayers.vue'
import Close from '../assets/Close.vue'
import ConfirmModal from './ConfirmModal.vue'
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

function sizeForCount(count) {
  const n = Math.max(count, 2)
  if (n <= 4) return 4
  if (n <= 8) return 8
  return 16
}

const modalTargetSize = ref(sizeForCount(props.players.length))

watch(
  () => [props.showModal, props.players],
  ([open]) => {
    if (!open) return
    playersText.value = serializePlayers(props.players)
    textAreaValid.value = props.players.length >= 2
    attempted.value = false
    modalTargetSize.value = sizeForCount(props.players.length)
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

const isConfirmVisible = ref(false)
const pendingUpdate = ref(null)

const setUpdatePlayers = () => {
  attempted.value = true
  const next = validatePlayersInput(playersText.value)
  if (!next.ok) {
    toast.error(next.error || 'Se necesitan al menos 2 jugadores')
    return
  }

  pendingUpdate.value = next
  isConfirmVisible.value = true
}

const confirmUpdatePlayers = () => {
  const next = pendingUpdate.value
  pendingUpdate.value = null
  if (!next?.ok) return

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
  isConfirmVisible.value = false
  pendingUpdate.value = null
  attempted.value = false
  emit('close')
}
</script>
