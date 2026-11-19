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
import { getFormat, resolveFormatId } from '../lib/formats/index.js'

const router = useRouter()
const { competitionData, startCompetition } = useSession()

function onSubmit(formData) {
  const format =
    getFormat(resolveFormatId(formData.tournamentFormat)) ?? getFormat('e')

  const state = {
    format: format.id,
    data: format.engine.create(
      formData.tournamentPlayers,
      formData.tournamentOptions ?? {}
    ),
  }

  startCompetition(formData, state)
  router.push({ name: 'competition' })
}
</script>
