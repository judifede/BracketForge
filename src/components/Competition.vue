<template>
  <Heading
    tag="h2"
    additionalClasses="!text-xl sm:!text-2xl !h-auto md:!h-[60px] competition-title"
    data-tour="competition-title"
  >
    {{ competitionTitle }}
  </Heading>

  <section class="flex flex-col gap-3 sm:gap-5 w-full max-w-full px-0 sm:px-4">
    <article
      class="bracket-toolbar"
      aria-label="Controles del bracket"
      data-tour="competition-toolbar"
    >
      <button
        type="button"
        class="toolbar-btn toolbar-btn--ghost"
        data-tour="competition-back"
        @click="goBack"
      >
        Volver
      </button>

      <p class="toolbar-format">
        Formato
        <span>{{ displayFormat }}</span>
      </p>

      <div class="toolbar-actions">
        <button
          type="button"
          class="toolbar-btn toolbar-btn--live"
          data-tour="competition-reshuffle"
          @click="onReshuffle"
        >
          Reordenar
        </button>
        <button
          type="button"
          class="toolbar-btn toolbar-btn--primary"
          data-tour="competition-update"
          @click="openUpdateModal"
        >
          Actualizar
        </button>
        <button
          type="button"
          class="toolbar-btn toolbar-btn--ghost"
          data-tour="competition-share"
          @click="onShare"
        >
          Compartir
        </button>
        <button
          type="button"
          class="toolbar-btn toolbar-btn--ghost"
          data-tour="competition-export"
          @click="onExportPng"
        >
          Exportar PNG
        </button>
        <button
          type="button"
          class="toolbar-btn toolbar-btn--ghost no-print-hide"
          data-tour="competition-print"
          @click="onPrint"
        >
          Imprimir
        </button>
      </div>
    </article>

    <p v-if="champion" class="champion-banner" data-tour="competition-champion">
      Campeón: <strong>{{ champion }}</strong>
    </p>
    <p class="winner-hint" data-tour="competition-hint">
      Clic en el rival para cambiar el ganador de un enfrentamiento.
    </p>

    <article class="bracket-stage" data-tour="competition-bracket">
      <Brackets
        ref="bracketsRef"
        :bracket="bracket"
        :tournament-name="competitionData.tournamentName"
        @select-winner="onSelectWinner"
      />
    </article>
  </section>

  <PlayersModal
    title="Actualizar brackets"
    :showModal="isUpdateModalVisible"
    :players="bracket.seeds"
    @update:showModal="isUpdateModalVisible = $event"
    @update-players="onUpdatePlayers"
    @close="closeUpdateModal"
  />
</template>

<script setup>
import Heading from '../assets/Heading.vue'
import Brackets from './Brackets.vue'
import PlayersModal from './PlayersModal.vue'
import { useBracket } from '../composables/useBracket.js'
import { useSession } from '../composables/useSession.js'
import { parsePlayers } from '../utils/players.js'
import { toast } from 'vue-sonner'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  competitionData: {
    type: Object,
    required: true,
  },
  initialBracket: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['go-back', 'bracket-change', 'competition-data-change'])

const { getShareUrl } = useSession()
const bracketsRef = ref(null)

const competitionTitle = computed(() => {
  const type = props.competitionData.tournamentType?.trim() ?? ''
  const name = props.competitionData.tournamentName?.trim() ?? ''
  if (!type) return name
  if (!name) return type
  if (name.toLowerCase().includes(type.toLowerCase())) return name
  return `${type} ${name}`
})

const displayFormat = computed(() => {
  const format = props.competitionData.tournamentFormat || 'Eliminación simple'
  if (format === 'Single Elimination') return 'Eliminación simple'
  return format
})

const initialPlayers = parsePlayers(props.competitionData.tournamentPlayers)
const { bracket, champion, rebuild, reshuffle, advance } = useBracket(
  initialPlayers,
  props.initialBracket
)

watch(
  bracket,
  (value) => {
    emit('bracket-change', value)
  },
  { deep: true, immediate: true }
)

watch(champion, (value, previous) => {
  if (value && value !== previous) {
    toast.success(`¡${value} es el campeón!`, {
      duration: 4500,
      class: 'champion-toast',
    })
  }
})

const onReshuffle = () => {
  const confirmed = window.confirm(
    'Reordenar reinicia todos los resultados del bracket. ¿Continuar?'
  )
  if (!confirmed) return
  reshuffle()
  toast.info('Bracket reordenado')
}

const onSelectWinner = ({ matchId, winner }) => {
  const result = advance(matchId, winner)
  if (!result.ok) {
    toast.error('No se pudo elegir ganador')
    return
  }
  if (!result.champion) {
    toast.success(`${winner} avanza`)
  }
}

const onUpdatePlayers = (playersUpdated) => {
  rebuild(playersUpdated)
  emit('competition-data-change', {
    ...props.competitionData,
    tournamentPlayers: playersUpdated,
  })
}

const isUpdateModalVisible = ref(false)

const openUpdateModal = () => {
  isUpdateModalVisible.value = true
}

const closeUpdateModal = () => {
  isUpdateModalVisible.value = false
}

const goBack = () => {
  emit('go-back')
}

async function onShare() {
  const url = getShareUrl()
  if (!url) {
    toast.error('No se pudo generar el enlace')
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  } catch {
    toast.error('No se pudo copiar el enlace')
  }
}

async function onExportPng() {
  try {
    await bracketsRef.value?.exportPng?.(
      `${props.competitionData.tournamentName || 'bracket'}.png`
    )
    toast.success('PNG exportado')
  } catch {
    toast.error('No se pudo exportar el PNG')
  }
}

function onPrint() {
  window.print()
}
</script>

<style scoped lang="postcss">
.bracket-toolbar {
  @apply flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4;
  @apply mx-auto w-full max-w-5xl px-2 py-2 sm:px-3 sm:py-2.5;
  position: sticky;
  top: 0.5rem;
  z-index: 20;
  background: linear-gradient(
    180deg,
    rgba(28, 36, 44, 0.97) 0%,
    rgba(18, 24, 30, 0.95) 100%
  );
  border: 1px solid var(--border-subtle, #262626);
  border-radius: 6px;
  backdrop-filter: blur(6px);
}

.toolbar-format {
  @apply m-0 text-[0.65rem] sm:text-xs font-medium uppercase tracking-[0.1em] sm:tracking-[0.12em] text-white/80;
}

.toolbar-format span {
  @apply ml-1.5 sm:ml-2 text-xs sm:text-sm normal-case tracking-normal font-semibold;
  color: var(--accent-live, #2dd4bf);
}

.toolbar-actions {
  @apply flex flex-wrap items-center justify-center gap-1.5 sm:gap-2;
}

.toolbar-btn {
  @apply px-2.5 py-1 text-xs sm:px-3.5 sm:py-1.5 sm:text-sm font-medium transition-colors duration-150;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
}

.toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: color-mix(in srgb, var(--bg-slot) 70%, #64748b);
  color: rgba(255, 255, 255, 0.5);
  border-color: var(--border-subtle);
}

.toolbar-btn--ghost {
  border-color: rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.8);
}

.toolbar-btn--ghost:hover:enabled {
  border-color: rgba(255, 255, 255, 0.45);
  color: #fff;
}

.toolbar-btn--live {
  border-color: color-mix(in srgb, var(--accent-live, #2dd4bf) 55%, transparent);
  color: var(--accent-live, #2dd4bf);
}

.toolbar-btn--live:hover:enabled {
  background: color-mix(in srgb, var(--accent-live, #2dd4bf) 12%, transparent);
  border-color: var(--accent-live, #2dd4bf);
}

.toolbar-btn--primary {
  border-color: color-mix(in srgb, var(--accent-win, #f5c518) 60%, transparent);
  color: var(--accent-win, #f5c518);
}

.toolbar-btn--primary:hover:enabled {
  background: color-mix(in srgb, var(--accent-win, #f5c518) 12%, transparent);
  border-color: var(--accent-win, #f5c518);
}

.champion-banner {
  margin: 0 auto;
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--accent-win) 55%, transparent);
  background: color-mix(in srgb, var(--accent-win) 12%, transparent);
  color: var(--accent-win);
  font-size: 0.95rem;
  animation: champion-pop 0.45s ease-out;
}

.winner-hint {
  margin: 0 auto;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.bracket-stage {
  @apply w-full overflow-x-auto px-1 py-3 sm:px-4 sm:py-5;
  background:
    radial-gradient(
      ellipse 80% 60% at 50% 0%,
      rgba(45, 212, 191, 0.06) 0%,
      transparent 55%
    ),
    linear-gradient(180deg, #121820 0%, #0b1116 48%, #0a0e12 100%);
  border: 1px solid var(--border-subtle, #262626);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:deep(.competition-title) {
  color: var(--accent-win, #f5c518) !important;
}

@keyframes champion-pop {
  from {
    opacity: 0;
    transform: translateY(-0.35rem) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
