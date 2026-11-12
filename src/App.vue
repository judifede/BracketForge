<template>
  <div class="app-shell flex min-h-[calc(100vh-2rem)] flex-col sm:min-h-[calc(100vh-4rem)]">
    <HelpToolbar
      class="no-print"
      @start-tour="startTour"
      @open-vue-lesson="vueLessonOpen = true"
    />

    <main class="flex flex-1 flex-col items-center gap-6 sm:gap-10">
      <Heading tag="h1" additionalClasses="brand-heading" data-tour="app-brand">
        BracketForge
      </Heading>

      <RouterView />
    </main>

    <footer class="mt-auto pt-10 pb-2 text-center no-print">
      <a
        href="http://judifede.github.io/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-white/80 transition-colors hover:text-white"
      >
        Desarrollado por Diego Fernández
      </a>
    </footer>

    <VueLessonPanel v-model="vueLessonOpen" :view="currentView" />
    <Toaster richColors />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toaster, toast } from 'vue-sonner'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import Heading from './assets/Heading.vue'
import HelpToolbar from './components/HelpToolbar.vue'
import VueLessonPanel from './components/VueLessonPanel.vue'
import { useSession } from './composables/useSession.js'
import { getTourSteps } from './lib/tourSteps.js'

const route = useRoute()
const router = useRouter()
const { hydrate, view, competitionData } = useSession()
const vueLessonOpen = ref(false)
const booted = ref(false)

const currentView = computed(() =>
  route.name === 'competition' || view.value === 'competition'
    ? 'competition'
    : 'setup'
)

onMounted(async () => {
  const result = hydrate()
  if (result.error) {
    toast.error('El enlace compartido no es válido. Volviendo a la configuración.')
  } else if (result.fromShare) {
    toast.success('Competición cargada desde el enlace')
  }

  if (view.value === 'competition' && competitionData.value) {
    if (route.name !== 'competition') {
      await router.replace({ name: 'competition' })
    }
  } else if (route.name === 'competition' && !competitionData.value) {
    await router.replace({ name: 'setup' })
  }

  booted.value = true
})

watch(
  () => route.name,
  (name) => {
    if (!booted.value) return
    if (name === 'competition') view.value = 'competition'
    else view.value = 'setup'
  }
)

function startTour() {
  const steps = getTourSteps(currentView.value).filter((step) => {
    if (!step.element) return true
    return Boolean(document.querySelector(step.element))
  })

  if (!steps.length) {
    toast.info('No hay pasos de tour disponibles en esta vista.')
    return
  }

  const tour = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: 'rgba(5, 8, 12, 0.72)',
    stagePadding: 8,
    stageRadius: 6,
    popoverClass: 'cbg-driver-popover',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    doneBtnText: 'Listo',
    progressText: '{{current}} / {{total}}',
    steps,
  })

  tour.drive()
}
</script>

<style scoped>
.brand-heading {
  font-family: var(--font-display);
  letter-spacing: 0.01em;
}
</style>
