<template>
  <Form
    :initial="competitionData"
    @submit-form="onSubmit"
  />
</template>

<script setup>
import { useRouter } from 'vue-router'
import Form from '../components/Init/Form.vue'
import { useSession } from '../composables/useSession.js'
import { buildBracket } from '../lib/bracket.js'

const router = useRouter()
const { competitionData, startCompetition } = useSession()

function onSubmit(formData) {
  const nextBracket = buildBracket(formData.tournamentPlayers)
  startCompetition(formData, nextBracket)
  router.push({ name: 'competition' })
}
</script>
