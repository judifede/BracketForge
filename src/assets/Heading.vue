<template>
  <component
    :is="tag"
    :class="[
      'box md:h-[70px] text-2xl sm:text-3xl md:text-4xl text-win',
      additionalClasses,
    ]"
  >
    <div class="inline-flex flex-col gap-3">
      <slot></slot>
      <!-- Slot por defecto -->
      <template v-if="$slots.developed">
        <code class="text-sm self-end">
          <slot name="developed"></slot>
          <!-- Slot nombrado developed-->
        </code>
      </template>
    </div>
  </component>
</template>

<script setup>
defineProps({
  tag: {
    type: String,
    default: 'h1',
  },
  additionalClasses: {
    type: [String, Object, Array],
    default: '',
  },
})
</script>
