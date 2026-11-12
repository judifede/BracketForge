<template>
  <div class="animate-setup-enter w-full max-w-[520px] mx-auto">
    <Heading tag="h2" additionalClasses="!text-2xl !h-auto mb-[0.35rem]" data-tour="setup-heading">
      Configurar competición
    </Heading>
    <p class="-mt-[0.35rem] mb-5 text-[0.95rem] leading-snug text-text-muted">
      Define el torneo, añade participantes y genera el bracket en segundos.
    </p>

    <form class="w-full" @submit.prevent="submitForm">
      <section
        class="panel panel--setup text-white md:px-12 px-6 !py-8 md:box !flex flex-col gap-form_gap"
        data-tour="setup-form"
      >
        <div class="flex flex-col gap-1 text-left">
          <label for="name" class="!justify-start text-sm font-medium text-white">
            Nombre de la competición
          </label>
          <input
            placeholder="Ej. Torneo Primavera"
            type="text"
            id="name"
            name="name"
            v-model="tournamentName"
            data-tour="setup-name"
            @blur="nameTouched = true"
            :class="{ 'no-valid': showNameError }"
            :aria-invalid="showNameError"
            :aria-describedby="showNameError ? 'name-error' : undefined"
          />
          <div
            v-if="showNameError"
            id="name-error"
            class="error-message"
            role="alert"
          >
            El nombre es obligatorio.
          </div>
        </div>

        <div class="flex flex-col gap-1 text-left">
          <label for="format" class="!justify-start text-sm font-medium text-white">
            Formato
          </label>
          <select id="format" name="format" v-model="tournamentFormat" data-tour="setup-format">
            <option value="Eliminación simple">Eliminación simple</option>
            <option value="Doble eliminación" disabled>
              Doble eliminación (próximamente)
            </option>
            <option value="Todos contra todos" disabled>
              Todos contra todos (próximamente)
            </option>
            <option value="Suizo" disabled>Suizo (próximamente)</option>
            <option value="Todos contra todos libre" disabled>
              FFA (próximamente)
            </option>
          </select>
        </div>

        <div class="flex flex-col items-start gap-[0.45rem] pt-1 text-left" data-tour="setup-presets">
          <span class="text-sm font-medium text-white">Relleno rápido</span>
          <div class="flex flex-wrap items-center gap-[0.4rem]">
            <button
              v-for="theme in THEMES"
              :key="theme.id"
              type="button"
              class="chip chip--preset"
              @click="applyThemePreset(theme.id)"
            >
              {{ theme.label }}
            </button>
          </div>
        </div>

        <FormPlayers
          id="players"
          name="players"
          v-model:players="playersText"
          v-model:target-size="selectedSize"
          :force-show-errors="submitted"
          data-tour="setup-players"
          @isTextAreaValid="handleIsTextAreaValid"
          @validation="handlePlayersValidation"
        />

        <div
          v-if="submitted && !isFormValid"
          id="form-error"
          class="error-message text-left"
          role="alert"
        >
          Revisa los campos marcados antes de crear el bracket.
        </div>

        <div class="flex flex-wrap items-center justify-center gap-[0.65rem] pt-1">
          <button
            type="button"
            class="chip chip--surprise"
            @click="applySurprisePreset"
          >
            Sorpresa
          </button>
          <button
            class="btn btn--solid"
            type="submit"
            data-tour="setup-submit"
            :disabled="!isFormValid"
          >
            Crear bracket
          </button>
        </div>
      </section>
    </form>

    <div class="mt-4" v-if="canShareSetup">
      <button
        type="button"
        class="btn btn--live rounded px-[0.85rem] py-[0.4rem] text-[0.85rem] font-semibold"
        data-tour="setup-share"
        @click="onShare"
      >
        Compartir configuración
      </button>
    </div>
  </div>
</template>

<script setup>
import Heading from '../../assets/Heading.vue'
import FormPlayers from './FormPlayers.vue'
import {
  serializePlayers,
  validateCompetitionForm,
} from '../../utils/formValidation.js'
import {
  THEMES,
  buildPreset,
  buildSurprisePreset,
} from '../../data/formPresets.js'
import { toast } from 'vue-sonner'
import { useSession } from '../../composables/useSession.js'

import { ref, computed, watch } from 'vue'

const props = defineProps({
  initial: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['submit-form'])
const { getShareUrl, setCompetitionData } = useSession()

const tournamentName = ref('')
const tournamentFormat = ref('Eliminación simple')
const playersText = ref('')

const isTextAreaValid = ref(false)
const playersValidation = ref(null)
const nameTouched = ref(false)
const submitted = ref(false)
const selectedSize = ref(8)

function applyInitial(data) {
  if (!data) return
  tournamentName.value = data.tournamentName ?? ''
  tournamentFormat.value =
    migrateFormat(data.tournamentFormat) ?? 'Eliminación simple'
  if (Array.isArray(data.tournamentPlayers)) {
    playersText.value = serializePlayers(data.tournamentPlayers)
  } else if (typeof data.tournamentPlayers === 'string') {
    playersText.value = data.tournamentPlayers
  }
}

function migrateFormat(format) {
  if (!format) return null
  if (format === 'Single Elimination') return 'Eliminación simple'
  if (format === 'Double Elimination') return 'Doble eliminación'
  if (format === 'Round Robin') return 'Todos contra todos'
  if (format === 'Swiss') return 'Suizo'
  if (format === 'Free for all') return 'Todos contra todos libre'
  return format
}

function applyFilledPreset(preset) {
  tournamentName.value = preset.tournamentName
  tournamentFormat.value = migrateFormat(preset.tournamentFormat) || 'Eliminación simple'
  playersText.value = preset.tournamentPlayers
  submitted.value = false
  nameTouched.value = false
}

function applyThemePreset(themeId) {
  applyFilledPreset(buildPreset({ themeId, size: selectedSize.value }))
}

function applySurprisePreset() {
  const surprise = buildSurprisePreset()
  selectedSize.value = surprise.size
  applyFilledPreset(surprise)
}

applyInitial(props.initial)

watch(
  () => props.initial,
  (value) => {
    applyInitial(value)
  }
)

const handleIsTextAreaValid = (state) => {
  isTextAreaValid.value = state
}

const handlePlayersValidation = (result) => {
  playersValidation.value = result
}

const isNameValid = computed(() => tournamentName.value.trim() !== '')

const showNameError = computed(
  () => (nameTouched.value || submitted.value) && !isNameValid.value
)

const isFormValid = computed(() => {
  return isTextAreaValid.value && isNameValid.value
})

const canShareSetup = computed(() => {
  return Boolean(props.initial?.tournamentPlayers?.length >= 2)
})

async function onShare() {
  const url = getShareUrl()
  if (!url) {
    toast.error('No hay nada que compartir todavía')
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  } catch {
    toast.error('No se pudo copiar el enlace')
  }
}

const submitForm = () => {
  submitted.value = true
  nameTouched.value = true

  const result = validateCompetitionForm({
    tournamentName: tournamentName.value,
    tournamentFormat: tournamentFormat.value,
    tournamentPlayers: playersText.value,
  })

  if (!result.ok || !result.data) {
    toast.error(result.error || 'Revisa el formulario.')
    return
  }

  if (result.playersResult.hadDuplicates) {
    toast.info('Se omitieron nombres duplicados.')
  }

  setCompetitionData(result.data)
  emit('submit-form', result.data)
}
</script>
