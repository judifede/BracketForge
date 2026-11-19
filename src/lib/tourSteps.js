/**
 * driver.js tour steps per view. Selectors use data-tour attributes.
 * El tour de competición se adapta al formato activo.
 */

import { getFormat } from './formats/index.js'

/** @typedef {{ element?: string, popover: { title: string, description: string, side?: string, align?: string } }} TourStep */

/**
 * Descripción de la vista de competición según el formato.
 * @type {Record<string, { title: string, description: string }>}
 */
const FORMAT_TOUR = {
  e: {
    title: 'Bracket interactivo',
    description:
      'Haz clic en un jugador para que avance. Arrastra, usa la rueda (vertical) o Ctrl+rueda (horizontal). Zoom con los botones.',
  },
  d: {
    title: 'Doble eliminación',
    description:
      'Arriba el bracket de ganadores, abajo el de perdedores y a la derecha la gran final. Haz clic en un jugador para decidir el partido.',
  },
  r: {
    title: 'Clasificación y jornadas',
    description:
      'Arriba la tabla de clasificación y abajo las jornadas. Escribe el marcador de cada partido con los dos campos numéricos.',
  },
  s: {
    title: 'Rondas suizas',
    description:
      'Genera una ronda nueva cuando la anterior esté completa. El emparejamiento evita revanchas y los descansos suman un punto.',
  },
}

/** @type {Record<'setup'|'competition', TourStep[]>} */
export const TOUR_STEPS = {
  setup: [
    {
      element: '[data-tour="setup-heading"]',
      popover: {
        title: 'Configura tu torneo',
        description:
          'Desde aquí defines nombre, formato y participantes antes de generar el torneo.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="setup-name"]',
      popover: {
        title: 'Nombre',
        description: 'Obligatorio. Aparecerá como título del torneo.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="setup-format"]',
      popover: {
        title: 'Formato',
        description:
          'Eliminación simple, doble eliminación, todos contra todos o suizo. Cada uno tiene sus propias reglas.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="setup-options"]',
      popover: {
        title: 'Opciones del formato',
        description:
          'Ajustes del formato elegido: doble vuelta, puntos, número de rondas…',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="setup-players"]',
      popover: {
        title: 'Participantes',
        description:
          'Uno por línea o separados por coma. Se normalizan espacios y se omiten duplicados.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="setup-presets"]',
      popover: {
        title: 'Relleno rápido',
        description:
          'Temas, tamaños y Sorpresa rellenan el formulario para probar al instante.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="setup-submit"]',
      popover: {
        title: 'Crear torneo',
        description:
          'Cuando el formulario es válido, genera el cuadro y te lleva a la competición.',
        side: 'top',
      },
    },
  ],
  competition: [
    {
      element: '[data-tour="competition-toolbar"]',
      popover: {
        title: 'Barra de controles',
        description:
          'Queda fija arriba para volver, reordenar, actualizar o compartir.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="competition-back"]',
      popover: {
        title: 'Volver',
        description: 'Regresa a la configuración sin perder la sesión guardada.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="competition-reshuffle"]',
      popover: {
        title: 'Reordenar',
        description:
          'Reinicia el progreso del torneo según el formato (pide confirmación).',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="competition-update"]',
      popover: {
        title: 'Actualizar',
        description:
          'Cambia la lista de jugadores. También reinicia el torneo.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="competition-share"]',
      popover: {
        title: 'Compartir',
        description:
          'Copia un enlace con el estado comprimido en la URL para abrirlo en otro sitio.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="competition-bracket"]',
      popover: {
        title: 'Vista del torneo',
        description: 'Clic en un jugador para que avance.',
        side: 'top',
      },
    },
  ],
}

/**
 * @param {'setup'|'competition'} view
 * @param {string} [formatId] Id del formato activo (`e`, `d`, `r`, `s`).
 * @returns {TourStep[]}
 */
export function getTourSteps(view, formatId) {
  const steps = TOUR_STEPS[view] || TOUR_STEPS.setup
  if (view !== 'competition') return steps

  const formatTour = FORMAT_TOUR[formatId] ?? FORMAT_TOUR.e
  const formatEntry = getFormat(formatId)
  return steps.map((step) => {
    if (step.element === '[data-tour="competition-bracket"]') {
      return { ...step, popover: { ...step.popover, ...formatTour } }
    }
    if (step.element === '[data-tour="competition-reshuffle"]') {
      return {
        ...step,
        popover: {
          ...step.popover,
          title: formatEntry?.reorderLabel ?? step.popover.title,
          description: formatEntry?.reorderMessage ?? step.popover.description,
        },
      }
    }
    return step
  })
}
