<template>
  <Competition
    v-if="competitionData"
    :key="competitionData.tournamentFormat"
    :competition-data="competitionData"
    :initial-state="state"
    @go-back="onGoBack"
    @state-change="onStateChange"
    @competition-data-change="onCompetitionDataChange"
  />
  <p v-else class="text-live">Cargando competición…</p>
</template>

<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import Competition from '../components/Competition.vue'
import { useSession } from '../composables/useSession.js'

const router = useRouter()
const {
  competitionData,
  state,
  hydrated,
  goToSetup,
  setState,
  setCompetitionData,
} = useSession()

// Esperar a hydrate: un redirect antes de leer `#s=` borra el hash del enlace.
watch(
  [hydrated, competitionData],
  ([ready, data]) => {
    if (!ready) return
    if (!data) router.replace({ name: 'setup' })
  },
  { immediate: true }
)

function onGoBack() {
  goToSetup()
  router.push({ name: 'setup' })
}

function onStateChange(next) {
  setState(next)
}

function onCompetitionDataChange(next) {
  setCompetitionData(next)
}
</script>
