<template>
  <Heading
    tag="h2"
    additionalClasses="!text-xl sm:!text-2xl !h-auto md:!h-[60px] text-win"
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
        class="btn btn--toolbar btn--ghost"
        data-tour="competition-back"
        @click="goBack"
      >
        Volver
      </button>

      <p class="toolbar-format">
        Formato
        <span>{{ displayFormat }}</span>
      </p>

      <p
        v-if="champion"
        class="champion-chip"
        data-tour="competition-champion"
      >
        Campeón
        <strong>{{ champion }}</strong>
      </p>

      <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <button
          type="button"
          class="btn btn--toolbar btn--live"
          data-tour="competition-reshuffle"
          @click="onReshuffle"
        >
          Reordenar
        </button>
        <button
          type="button"
          class="btn btn--toolbar btn--primary"
          data-tour="competition-update"
          @click="openUpdateModal"
        >
          Actualizar
        </button>
        <button
          type="button"
          class="btn btn--toolbar btn--ghost"
          data-tour="competition-share"
          @click="onShare"
        >
          Compartir
        </button>
      </div>
    </article>

    <article class="bracket-stage" data-tour="competition-bracket">
      <Brackets
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

  <ConfirmModal
    v-model="isReshuffleConfirmVisible"
    title="Reordenar bracket"
    message="Reordenar reinicia todos los resultados del bracket. ¿Continuar?"
    @confirm="confirmReshuffle"
  />
</template>

<script setup>
import Heading from '../assets/Heading.vue'
import Brackets from './Brackets.vue'
import PlayersModal from './PlayersModal.vue'
import ConfirmModal from './ConfirmModal.vue'
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

const { createShareUrl, getShareUrl } = useSession()

const competitionTitle = computed(
  () => props.competitionData.tournamentName?.trim() ?? ''
)

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

const isReshuffleConfirmVisible = ref(false)

const onReshuffle = () => {
  isReshuffleConfirmVisible.value = true
}

const confirmReshuffle = () => {
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
  let url = await createShareUrl()
  if (!url) url = getShareUrl()
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
</script>
