<template>
  <div class="setup-shell w-full max-w-[440px] mx-auto">
    <Heading tag="h2" additionalClasses="!text-2xl !h-auto setup-heading" data-tour="setup-heading">
      Configurar competición
    </Heading>
    <p class="setup-lead">
      Define el torneo, añade participantes y genera el bracket en segundos.
    </p>

    <form class="w-full" @submit.prevent="submitForm">
      <section
        class="form-panel text-white md:px-12 px-6 !py-8 md:box !flex flex-col gap-form_gap"
        data-tour="setup-form"
      >
        <div class="flex flex-col gap-1 text-left">
          <label for="name" class="!justify-start text-sm font-medium text-white/80">
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
          <label for="format" class="!justify-start text-sm font-medium text-white/80">
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

        <FormPlayers
          id="players"
          name="players"
          v-model:players="playersText"
          :force-show-errors="submitted"
          data-tour="setup-players"
          @isTextAreaValid="handleIsTextAreaValid"
          @validation="handlePlayersValidation"
        />

        <div class="flex flex-col gap-2 text-left pt-1" data-tour="setup-presets">
          <span class="text-sm font-medium text-white/80">Relleno rápido</span>

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="theme in THEMES"
              :key="theme.id"
              type="button"
              class="preset-chip"
              @click="applyThemePreset(theme.id)"
            >
              {{ theme.label }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-white/80">Jugadores</span>
            <div
              class="inline-flex flex-wrap gap-1"
              role="group"
              aria-label="Cantidad de jugadores"
            >
              <button
                v-for="size in SIZES"
                :key="size"
                type="button"
                class="size-chip"
                :class="{ 'size-chip--active': selectedSize === size }"
                :aria-pressed="selectedSize === size"
                @click="selectedSize = size"
              >
                {{ size }}
              </button>
            </div>

            <button
              type="button"
              class="surprise-chip"
              @click="applySurprisePreset"
            >
              Sorpresa
            </button>
          </div>
        </div>

        <div
          v-if="submitted && !isFormValid"
          id="form-error"
          class="error-message text-left"
          role="alert"
        >
          Revisa los campos marcados antes de crear el bracket.
        </div>

        <div class="m-auto pt-1">
          <button
            class="submit-btn"
            type="submit"
            data-tour="setup-submit"
            :disabled="!isFormValid"
          >
            Crear bracket
          </button>
        </div>
      </section>
    </form>

    <div class="setup-share" v-if="canShareSetup">
      <button type="button" class="share-setup-btn" data-tour="setup-share" @click="onShare">
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
  SIZES,
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

<style scoped>
.setup-shell {
  animation: setup-enter 0.45s ease-out;
}

.setup-lead {
  margin: -0.35rem 0 1.25rem;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
}

.form-panel {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg-panel) 92%, #243040) 0%,
    var(--bg-panel) 100%
  );
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
}

.preset-chip,
.size-chip,
.surprise-chip {
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}

.preset-chip,
.size-chip {
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.88);
}

.preset-chip:hover,
.size-chip:hover {
  border-color: var(--accent-live);
  color: var(--accent-live);
  transform: translateY(-1px);
}

.size-chip--active {
  border-color: var(--accent-live);
  color: var(--accent-live);
  background: color-mix(in srgb, var(--accent-live) 12%, transparent);
}

.surprise-chip {
  border: 1px solid var(--accent-win);
  color: var(--accent-win);
}

.surprise-chip:hover {
  background: color-mix(in srgb, var(--accent-win) 12%, transparent);
  transform: translateY(-1px);
}

.submit-btn {
  display: inline-block;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0.55rem 1.15rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: var(--accent-win);
  color: #121212;
  transition:
    filter 0.18s ease,
    transform 0.18s ease,
    opacity 0.18s ease;
}

.submit-btn:enabled:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: color-mix(in srgb, var(--bg-slot) 70%, #64748b);
  color: rgba(255, 255, 255, 0.55);
  border-color: var(--border-subtle);
}

.setup-share {
  margin-top: 1rem;
}

.share-setup-btn {
  border: 1px solid color-mix(in srgb, var(--accent-live) 50%, transparent);
  color: var(--accent-live);
  border-radius: 4px;
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.share-setup-btn:hover {
  background: color-mix(in srgb, var(--accent-live) 12%, transparent);
  border-color: var(--accent-live);
}

@keyframes setup-enter {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.setup-heading) {
  margin-bottom: 0.35rem;
}
</style>
