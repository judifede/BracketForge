<template>
  <div class="animate-setup-enter w-full max-w-[520px] mx-auto">
    <Heading tag="h2" additionalClasses="!text-2xl !h-auto mb-[0.35rem]" data-tour="setup-heading">
      Configurar competición
    </Heading>
    <p class="-mt-[0.35rem] mb-5 text-[0.95rem] leading-snug text-text-muted">
      Define el torneo, añade participantes y genéralo en segundos.
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
            <option
              v-for="format in FORMATS"
              :key="format.id"
              :value="format.id"
              :disabled="!format.implemented"
            >
              {{ format.label }}{{ format.implemented ? '' : ' (próximamente)' }}
            </option>
          </select>
        </div>

        <div
          v-if="formatOptions.length"
          class="flex flex-col gap-2.5 text-left"
          data-tour="setup-options"
        >
          <span class="text-sm font-medium text-white">Opciones del formato</span>
          <div class="flex flex-col gap-2">
            <template v-for="row in formatOptionRows" :key="row.key">
              <!--
                Outer row is a div on purpose: global `label` → container-label
                applies justify-between + w-full and crushes checkbox + hint.
              -->
              <div
                v-if="row.kind === 'bool'"
                class="form-option form-option--bool"
              >
                <input
                  :id="`opt-${row.option.key}`"
                  type="checkbox"
                  class="form-option__control"
                  :checked="Boolean(tournamentOptions[row.option.key])"
                  @change="
                    tournamentOptions[row.option.key] = $event.target.checked
                  "
                />
                <label :for="`opt-${row.option.key}`" class="form-option__text">
                  <span class="form-option__label">{{ row.option.label }}</span>
                  <span v-if="row.option.hint" class="form-option__hint">
                    {{ row.option.hint }}
                  </span>
                </label>
              </div>
              <div v-else class="form-option-numbers">
                <div
                  v-for="option in row.options"
                  :key="option.key"
                  class="form-option form-option--number"
                >
                  <label :for="`opt-${option.key}`" class="form-option__text">
                    <span class="form-option__label">{{ option.label }}</span>
                    <span v-if="option.hint" class="form-option__hint">
                      {{ option.hint }}
                    </span>
                  </label>
                  <input
                    :id="`opt-${option.key}`"
                    type="number"
                    class="form-option__control box !w-20 !max-w-full rounded-md border border-subtle !px-[0.45rem] !py-[0.3rem] text-white bg-slot"
                    :min="option.min"
                    :max="option.max"
                    :value="tournamentOptions[option.key]"
                    @input="onNumberOption(option, $event.target.value)"
                  />
                </div>
              </div>
            </template>
          </div>
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
          Revisa los campos marcados antes de crear el torneo.
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
            Crear torneo
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
import {
  FORMATS,
  getFormat,
  normalizeFormatOptions,
  resolveFormatId,
} from '../../lib/formats/index.js'
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
const { createShareUrl, getShareUrl, setCompetitionData } = useSession()

const tournamentName = ref('')
const tournamentFormat = ref('e')
const tournamentOptions = ref({})
const playersText = ref('')

const isTextAreaValid = ref(false)
const playersValidation = ref(null)
const nameTouched = ref(false)
const submitted = ref(false)
const selectedSize = ref(8)

/**
 * Formato cuyas opciones están cargadas en pantalla. Evita que el watcher
 * sobrescriba las opciones restauradas de una sesión o de un preset.
 */
let appliedFormatId = tournamentFormat.value

/**
 * Combina defaults del registro con overrides guardados/elegidos.
 * Así checkboxes y números nunca quedan “fantasma” (p. ej. doble vuelta).
 * @param {string} formatId
 * @param {unknown} [overrides]
 */
function mergeFormatOptions(formatId, overrides = {}) {
  const format = getFormat(formatId)
  return {
    ...(format?.defaultOptions ?? {}),
    ...normalizeFormatOptions(overrides),
  }
}

/**
 * @param {{ key: string, min?: number, max?: number }} option
 * @param {string} raw
 */
function onNumberOption(option, raw) {
  if (raw === '' || raw == null) {
    const defaults = getFormat(tournamentFormat.value)?.defaultOptions ?? {}
    if (!(option.key in defaults)) {
      delete tournamentOptions.value[option.key]
      return
    }
  }
  const value = Number(raw)
  tournamentOptions.value[option.key] = value
}

function applyInitial(data) {
  if (!data) return
  tournamentName.value = data.tournamentName ?? ''
  const formatId = resolveFormatId(data.tournamentFormat) ?? 'e'
  tournamentFormat.value = formatId
  appliedFormatId = formatId
  tournamentOptions.value = mergeFormatOptions(formatId, data.tournamentOptions)
  if (Array.isArray(data.tournamentPlayers)) {
    playersText.value = serializePlayers(data.tournamentPlayers)
  } else if (typeof data.tournamentPlayers === 'string') {
    playersText.value = data.tournamentPlayers
  }
}

function applyFilledPreset(preset) {
  tournamentName.value = preset.tournamentName
  const formatId = resolveFormatId(preset.tournamentFormat) ?? 'e'
  // El preset rellena nombre y participantes: no cambia el formato elegido
  // por el usuario (ni sus opciones) salvo que sea otro distinto.
  if (formatId !== tournamentFormat.value) {
    tournamentFormat.value = formatId
    appliedFormatId = formatId
    tournamentOptions.value = mergeFormatOptions(formatId)
  }
  playersText.value = preset.tournamentPlayers
  submitted.value = false
  nameTouched.value = false
}

function applyThemePreset(themeId) {
  applyFilledPreset(
    buildPreset({
      themeId,
      size: selectedSize.value,
      format: tournamentFormat.value,
    })
  )
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

const selectedFormat = computed(
  () => getFormat(tournamentFormat.value) ?? getFormat('e')
)

const formatOptions = computed(() => selectedFormat.value.optionSchema ?? [])

/**
 * Agrupa números consecutivos en una fila (p. ej. puntos victoria/empate)
 * y deja los booleanos como filas sueltas.
 * @returns {Array<{ kind: 'bool', key: string, option: object } | { kind: 'numbers', key: string, options: object[] }>}
 */
const formatOptionRows = computed(() => {
  const rows = []
  /** @type {object[]} */
  let numberBatch = []

  const flushNumbers = () => {
    if (!numberBatch.length) return
    rows.push({
      kind: 'numbers',
      key: `numbers:${numberBatch.map((o) => o.key).join('+')}`,
      options: numberBatch,
    })
    numberBatch = []
  }

  for (const option of formatOptions.value) {
    if (option.type === 'number') {
      numberBatch.push(option)
      continue
    }
    flushNumbers()
    rows.push({ kind: 'bool', key: option.key, option })
  }
  flushNumbers()
  return rows
})

// Al cambiar de formato se recargan sus opciones por defecto.
watch(tournamentFormat, (nextId) => {
  if (nextId === appliedFormatId) return
  appliedFormatId = nextId
  if (!getFormat(nextId)) return
  tournamentOptions.value = mergeFormatOptions(nextId)
})

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
  // Sincroniza lo visible en el formulario para no compartir un formato viejo.
  const result = validateCompetitionForm({
    tournamentName: tournamentName.value,
    tournamentFormat: tournamentFormat.value,
    tournamentPlayers: playersText.value,
    tournamentOptions: tournamentOptions.value,
  })
  if (result.ok && result.data) {
    setCompetitionData(result.data)
  }

  let url = await createShareUrl()
  if (!url) url = getShareUrl()
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
    tournamentOptions: tournamentOptions.value,
  })

  if (!result.ok || !result.data) {
    toast.error(result.error || 'Revisa el formulario.')
    return
  }

  if (result.playersResult.hadDuplicates) {
    toast.info('Se omitieron nombres duplicados.')
  }

  if (result.warning) {
    toast.info(result.warning)
  }

  setCompetitionData(result.data)
  emit('submit-form', result.data)
}
</script>
