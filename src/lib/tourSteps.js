/**
 * driver.js tour steps per view. Selectors use data-tour attributes.
 */

/** @typedef {{ element?: string, popover: { title: string, description: string, side?: string, align?: string } }} TourStep */

/** @type {Record<'setup'|'competition', TourStep[]>} */
export const TOUR_STEPS = {
  setup: [
    {
      element: '[data-tour="setup-heading"]',
      popover: {
        title: 'Configura tu torneo',
        description:
          'Desde aquí defines nombre, formato y participantes antes de generar el bracket.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="setup-name"]',
      popover: {
        title: 'Nombre',
        description: 'Obligatorio. Aparecerá como título del bracket.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="setup-format"]',
      popover: {
        title: 'Formato',
        description:
          'Hoy está disponible Eliminación simple. Otros formatos están documentados como próximos.',
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
        title: 'Crear bracket',
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
          'Queda fija arriba para volver, reordenar, actualizar, compartir o exportar.',
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
        description: 'Mezcla las semillas y reinicia el progreso (pide confirmación).',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="competition-update"]',
      popover: {
        title: 'Actualizar',
        description: 'Cambia la lista de jugadores. También reinicia el bracket.',
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
      element: '[data-tour="competition-export"]',
      popover: {
        title: 'Exportar PNG',
        description: 'Descarga una imagen del bracket SVG.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="competition-bracket"]',
      popover: {
        title: 'Bracket interactivo',
        description:
          'Haz clic en un jugador para que avance. Usa zoom, arrastre o la rueda para moverte.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="competition-hint"]',
      popover: {
        title: 'Cambiar ganador',
        description: 'Si te equivocas, haz clic en el rival del mismo partido.',
        side: 'bottom',
      },
    },
  ],
}

/**
 * @param {'setup'|'competition'} view
 * @returns {TourStep[]}
 */
export function getTourSteps(view) {
  return TOUR_STEPS[view] || TOUR_STEPS.setup
}
