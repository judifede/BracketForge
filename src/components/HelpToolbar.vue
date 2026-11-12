<template>
  <div
    class="fixed top-[0.85rem] right-[0.85rem] z-[60] inline-flex items-center gap-[0.4rem]"
    role="toolbar"
    aria-label="Ayuda"
  >
    <button
      type="button"
      class="help-btn"
      aria-label="Iniciar tour de ayuda"
      title="Tour de ayuda"
      @click="$emit('start-tour')"
    >
      ?
    </button>
    <button
      type="button"
      class="help-btn"
      aria-label="Conceptos Vue de esta vista"
      title="Conceptos Vue"
      @click="$emit('open-vue-lesson')"
    >
      <span class="font-mono text-[0.78rem] tracking-tighter" aria-hidden="true">&lt;/&gt;</span>
    </button>
  </div>
</template>

<script setup>
defineEmits(['start-tour', 'open-vue-lesson'])
</script>
