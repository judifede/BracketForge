<template>
  <vue-final-modal
    v-model="isOpen"
    class="confirm-modal-host flex items-center justify-center"
    content-class="modal-content-center"
    overlay-class="modal-overlay"
    :click-to-close="true"
    :esc-to-close="true"
    :focus-trap="true"
  >
    <div
      class="panel relative flex flex-col gap-5 px-7 py-7 min-w-[300px] max-w-[min(92vw,400px)]"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="messageId"
    >
      <h2 :id="titleId" class="text-lg font-bold text-left pr-8">
        {{ title }}
      </h2>
      <p :id="messageId" class="text-sm text-white/80 text-left leading-relaxed">
        {{ message }}
      </p>

      <button
        type="button"
        class="absolute right-3 top-2 p-1 text-white hover:text-brand"
        aria-label="Cerrar"
        @click="onCancel"
      >
        <Close additionalClasses="block" />
      </button>

      <div class="flex flex-wrap justify-end gap-3 pt-1">
        <button type="button" class="btn btn--ghost" @click="onCancel">
          {{ cancelLabel }}
        </button>
        <button type="button" class="btn btn--primary" @click="onConfirm">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Close from '../assets/Close.vue'

let confirmModalSeq = 0

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Confirmar',
  },
  message: {
    type: String,
    required: true,
  },
  confirmLabel: {
    type: String,
    default: 'Continuar',
  },
  cancelLabel: {
    type: String,
    default: 'Cancelar',
  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const uid = ++confirmModalSeq
const titleId = `confirm-modal-title-${uid}`
const messageId = `confirm-modal-message-${uid}`
const closingWithConfirm = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

watch(
  () => props.modelValue,
  (open, wasOpen) => {
    if (wasOpen && !open) {
      if (closingWithConfirm.value) {
        closingWithConfirm.value = false
        return
      }
      emit('cancel')
    }
  }
)

function onCancel() {
  isOpen.value = false
}

function onConfirm() {
  closingWithConfirm.value = true
  isOpen.value = false
  emit('confirm')
}
</script>
