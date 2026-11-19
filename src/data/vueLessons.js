/**
 * Didactic Vue lessons keyed by app view.
 * Keep copy short, Spanish, and tied to what is visible on screen.
 */

/** @typedef {{ title: string, concept: string, body: string }} VueLessonItem */

/** @type {Record<'setup'|'competition', { heading: string, intro: string, items: VueLessonItem[] }>} */
export const VUE_LESSONS = {
  setup: {
    heading: 'Vue en la pantalla de configuración',
    intro:
      'Esta vista es un formulario reactivo: lo que escribes actualiza el estado y Vue vuelve a pintar la UI.',
    items: [
      {
        title: 'v-model',
        concept: 'Enlace bidireccional',
        body:
          'Los inputs usan `v-model` para sincronizar el valor del campo con una variable reactiva (`ref`). Si cambias el texto, cambia el estado; si el estado cambia (p. ej. un preset), cambia el input.',
      },
      {
        title: 'Validación reactiva',
        concept: 'computed + watch',
        body:
          '`FormPlayers` valida la lista al vuelo. Un `computed` calcula si hay al menos 2 jugadores y emite el resultado al padre. El botón Crear se deshabilita cuando el formulario no es válido.',
      },
      {
        title: 'emit del formulario',
        concept: 'defineEmits',
        body:
          'Al enviar, el formulario no navega solo: emite `submit-form` con los datos limpios. El padre (`SetupView`) escucha ese evento, crea el bracket y cambia de ruta.',
      },
      {
        title: 'Componentes hijos',
        concept: 'props + slots de datos',
        body:
          '`FormPlayers` es un hijo reutilizable. Muestra casillas según el cupo (4/8/16), serializa los nombres y avisa al padre con `update:players` (patrón de `v-model:players`).',
      },
      {
        title: 'Presets y estado local',
        concept: 'ref / reactive',
        body:
          'Los botones de relleno rápido mutan el estado local del formulario. Eso demuestra que la UI es una proyección del estado, no HTML estático.',
      },
    ],
  },
  competition: {
    heading: 'Vue en la pantalla de competición',
    intro:
      'Aquí el bracket vive en un composable; la vista solo orquesta props, eventos y efectos visuales.',
    items: [
      {
        title: 'Carga diferida',
        concept: 'defineAsyncComponent / lazy route',
        body:
          'La ruta `/competition` carga su vista bajo demanda. Eso reduce el peso inicial: el código del bracket se descarga cuando lo necesitas.',
      },
      {
        title: 'Composable useTournament',
        concept: 'Composition API',
        body:
          '`useTournament` concentra la lógica del torneo (estado, campeón, aplicar resultado) y la delega en el motor del formato. El componente consume `state`, `champion` y métodos como `applyResult` sin mezclar reglas de negocio en el template.',
      },
      {
        title: 'Props y eventos',
        concept: 'props + emit',
        body:
          '`Competition` recibe `competitionData` por props y resuelve la vista según el formato. `Brackets` emite `@apply-result` al hacer clic en un slot; el padre lo aplica y muestra un toast.',
      },
      {
        title: 'Título computado',
        concept: 'computed',
        body:
          'El título muestra el nombre de la competición con un `computed`: se recalcula solo cuando cambia esa dependencia, sin watchers manuales.',
      },
      {
        title: 'Modal y toasts',
        concept: 'vue-final-modal + vue-sonner',
        body:
          'Actualizar jugadores abre un modal controlado por `v-model`. Los toasts confirman avances, el campeón o errores sin bloquear el bracket.',
      },
    ],
  },
}

/**
 * @param {'setup'|'competition'} view
 */
export function getVueLesson(view) {
  return VUE_LESSONS[view] || VUE_LESSONS.setup
}
