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
      aria-label="Controles del torneo"
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

      <div class="toolbar-format">
        <button
          type="button"
          class="toolbar-format-info"
          data-tour="competition-format-info"
          :aria-label="`Qué es ${displayFormat}`"
          :title="`Qué es ${displayFormat}`"
          @click="openFormatInfo"
        >
          <span aria-hidden="true">i</span>
        </button>
        <span>{{ displayFormat }}</span>
      </div>

      <p
        v-if="champion"
        class="champion-chip"
        data-tour="competition-champion"
      >
        Victoria
        <strong>{{ champion }}</strong>
      </p>

      <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <button
          type="button"
          class="btn btn--toolbar btn--live"
          data-tour="competition-reshuffle"
          @click="onReorder"
        >
          {{ reorderLabel }}
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
      <component
        :is="viewComponent"
        :state="state"
        :competition-data="competitionData"
        @apply-result="onApplyResult"
        @apply-action="onApplyAction"
      />
    </article>
  </section>

  <PlayersModal
    title="Actualizar participantes"
    :showModal="isUpdateModalVisible"
    :players="roster"
    @update:showModal="isUpdateModalVisible = $event"
    @update-players="onUpdatePlayers"
    @close="closeUpdateModal"
  />

  <ConfirmModal
    v-model="isReorderConfirmVisible"
    :title="reorderTitle"
    :message="reorderMessage"
    @confirm="confirmReorder"
  />

  <InfoModal
    v-model="isFormatInfoVisible"
    :title="displayFormat"
    :message="formatDescription"
  />
</template>

<script setup>
import Heading from '../assets/Heading.vue'
import Brackets from './Brackets.vue'
import DoubleEliminationView from './formats/DoubleEliminationView.vue'
import RoundRobinView from './formats/RoundRobinView.vue'
import SwissView from './formats/SwissView.vue'
import PlayersModal from './PlayersModal.vue'
import ConfirmModal from './ConfirmModal.vue'
import InfoModal from './InfoModal.vue'
import { useTournament } from '../composables/useTournament.js'
import { useSession } from '../composables/useSession.js'
import { getFormat, resolveFormatId } from '../lib/formats/index.js'
import { isLongShareUrl } from '../lib/shortShare.js'
import { toast } from 'vue-sonner'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  competitionData: {
    type: Object,
    required: true,
  },
  initialState: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['go-back', 'state-change', 'competition-data-change'])

const { createShareUrl, getShareUrl } = useSession()

/** Vistas disponibles por clave de formato. */
const VIEWS = {
  'single-elimination': Brackets,
  'double-elimination': DoubleEliminationView,
  'round-robin': RoundRobinView,
  swiss: SwissView,
}

const competitionTitle = computed(
  () => props.competitionData.tournamentName?.trim() ?? ''
)

const format = computed(
  () => getFormat(resolveFormatId(props.competitionData.tournamentFormat)) ?? getFormat('e')
)

const displayFormat = computed(() => format.value.label)

const formatDescription = computed(
  () =>
    format.value.description ??
    'Este formato define cómo se emparejan los participantes y cómo se decide el campeón.'
)

const viewComponent = computed(() => VIEWS[format.value.view] ?? Brackets)

const isFormatInfoVisible = ref(false)

const openFormatInfo = () => {
  isFormatInfoVisible.value = true
}

const initialPlayers = Array.isArray(props.competitionData.tournamentPlayers)
  ? [...props.competitionData.tournamentPlayers]
  : []

const { state, champion, engine, applyResult, applyAction, rebuild, reorder } =
  useTournament(
    format.value.id,
    props.initialState?.format === format.value.id ? props.initialState.data : null,
    initialPlayers,
    props.competitionData.tournamentOptions ?? {}
  )

const roster = computed(() => engine.getRoster(state.value))

watch(
  state,
  (value) => {
    emit('state-change', { format: format.value.id, data: value })
  },
  { deep: true, immediate: true }
)

watch(champion, (value, previous) => {
  if (value && value !== previous) {
    toast.success(`¡${value} se lleva la victoria!`, {
      duration: 4500,
      class: 'champion-toast',
    })
  }
})

const reorderLabel = computed(() => format.value.reorderLabel ?? 'Reordenar')
const reorderTitle = computed(() => format.value.reorderLabel ?? 'Reordenar')
const reorderMessage = computed(
  () =>
    format.value.reorderMessage ??
    'Reordenar reinicia todos los resultados del torneo. ¿Continuar?'
)

const isReorderConfirmVisible = ref(false)

const onReorder = () => {
  isReorderConfirmVisible.value = true
}

const confirmReorder = () => {
  reorder()
  toast.info('Torneo reordenado')
}

const onApplyResult = ({ matchId, result }) => {
  const outcome = applyResult(matchId, result)
  if (!outcome.ok) {
    toast.error(outcome.error || 'No se pudo aplicar el resultado')
    return
  }
  if (!outcome.champion && result?.winner) {
    toast.success(`${result.winner} avanza`)
  }
}

const onApplyAction = (action) => {
  const outcome = applyAction(action)
  if (!outcome.ok) {
    toast.error(outcome.error || 'No se pudo aplicar la acción')
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
    if (isLongShareUrl(url)) {
      toast.warning(
        'El enlace es muy largo y puede que no quepa en algunos sitios. Compártelo con calma.',
        { duration: 6000 }
      )
    }
  } catch {
    toast.error('No se pudo copiar el enlace')
  }
}
</script>
