<template>
  <div class="help-toolbar" role="toolbar" aria-label="Ayuda">
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
      <span class="code-icon" aria-hidden="true">&lt;/&gt;</span>
    </button>
  </div>
</template>

<script setup>
defineEmits(['start-tour', 'open-vue-lesson'])
</script>

<style scoped>
.help-toolbar {
  position: fixed;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 60;
  display: inline-flex;
  gap: 0.4rem;
}

.help-btn {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--accent-live) 45%, transparent);
  background: color-mix(in srgb, var(--bg-panel) 88%, #000);
  color: var(--accent-live);
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.help-btn:hover {
  transform: translateY(-1px);
  border-color: var(--accent-live);
  background: color-mix(in srgb, var(--accent-live) 14%, var(--bg-panel));
}

.code-icon {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: -0.04em;
}
</style>
