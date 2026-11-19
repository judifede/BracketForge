<template>
  <vue-final-modal
    v-model="isOpen"
    class="info-modal-host flex items-center justify-center"
    content-class="modal-content-center"
    overlay-class="modal-overlay"
    :click-to-close="true"
    :esc-to-close="true"
    :focus-trap="true"
  >
    <div
      class="panel relative flex flex-col gap-5 px-7 py-7 min-w-[300px] max-w-[min(92vw,420px)]"
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
        @click="onClose"
      >
        <Close additionalClasses="block" />
      </button>

      <div class="flex flex-wrap justify-end gap-3 pt-1">
        <button type="button" class="btn btn--primary" @click="onClose">
          {{ closeLabel }}
        </button>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { computed } from 'vue'
import Close from '../assets/Close.vue'

let infoModalSeq = 0

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Información',
  },
  message: {
    type: String,
    required: true,
  },
  closeLabel: {
    type: String,
    default: 'Entendido',
  },
})

const emit = defineEmits(['update:modelValue'])

const uid = ++infoModalSeq
const titleId = `info-modal-title-${uid}`
const messageId = `info-modal-message-${uid}`

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function onClose() {
  isOpen.value = false
}
</script>
