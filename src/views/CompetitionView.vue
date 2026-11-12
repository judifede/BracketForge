<template>
  <Competition
    v-if="competitionData"
    :competition-data="competitionData"
    :initial-bracket="bracket"
    @go-back="onGoBack"
    @bracket-change="onBracketChange"
    @competition-data-change="onCompetitionDataChange"
  />
  <p v-else class="text-[var(--accent-live)]">Cargando competición…</p>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Competition from '../components/Competition.vue'
import { useSession } from '../composables/useSession.js'

const router = useRouter()
const {
  competitionData,
  bracket,
  goToSetup,
  setBracket,
  setCompetitionData,
} = useSession()

onMounted(() => {
  if (!competitionData.value) {
    router.replace({ name: 'setup' })
  }
})

watch(
  competitionData,
  (value) => {
    if (!value) router.replace({ name: 'setup' })
  }
)

function onGoBack() {
  goToSetup()
  router.push({ name: 'setup' })
}

function onBracketChange(next) {
  setBracket(next)
}

function onCompetitionDataChange(next) {
  setCompetitionData(next)
}
</script>
