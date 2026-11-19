import {
  singleElimination,
  SINGLE_ELIMINATION_ID,
} from './singleElimination.js'
import {
  doubleElimination,
  DOUBLE_ELIMINATION_ID,
} from './doubleElimination.js'
import {
  roundRobin,
  ROUND_ROBIN_ID,
} from './roundRobin.js'
import {
  swiss,
  SWISS_ID,
} from './swiss.js'

/**
 * @typedef {import('./types.js').FormatEntry} FormatEntry
 * @typedef {import('./types.js').FormatId} FormatId
 */

/**
 * Registro único de formatos de torneo.
 *
 * La app, el setup, la persistencia, los enlaces compartidos y el tour
 * consumen esta lista: añadir un formato = añadir una entrada + motor + vista.
 *
 * @type {FormatEntry[]}
 */
export const FORMATS = [
  {
    id: SINGLE_ELIMINATION_ID,
    label: 'Eliminación simple',
    description:
      'Un solo bracket: pierdes una vez y quedas fuera. El cuadro se completa a potencia de 2 con byes automáticos. El ganador de cada partido avanza hasta la final.',
    legacyLabels: ['Eliminación simple', 'Single Elimination'],
    implemented: true,
    minPlayers: 2,
    defaultOptions: {},
    optionSchema: [],
    reorderLabel: 'Reordenar',
    reorderMessage:
      'Reordenar reinicia todos los resultados del bracket. ¿Continuar?',
    engine: singleElimination,
    view: 'single-elimination',
  },
  {
    id: DOUBLE_ELIMINATION_ID,
    label: 'Doble eliminación',
    description:
      'Hay que perder dos veces para quedar eliminado. Arriba el bracket de ganadores, abajo el de perdedores; el campeón se decide en la gran final.',
    legacyLabels: ['Doble eliminación', 'Double Elimination'],
    implemented: true,
    minPlayers: 4,
    defaultOptions: {},
    optionSchema: [],
    reorderLabel: 'Reordenar',
    reorderMessage:
      'Reordenar reinicia los brackets de ganadores y perdedores. ¿Continuar?',
    engine: doubleElimination,
    view: 'double-elimination',
  },
  {
    id: ROUND_ROBIN_ID,
    label: 'Todos contra todos',
    description:
      'Todos juegan contra todos. La clasificación se ordena por puntos (y desempates). Puedes activar doble vuelta y ajustar los puntos por victoria o empate.',
    legacyLabels: ['Todos contra todos', 'Round Robin'],
    implemented: true,
    minPlayers: 2,
    defaultOptions: { doubleRound: false, pointsWin: 3, pointsDraw: 1 },
    optionSchema: [
      {
        key: 'doubleRound',
        type: 'boolean',
        label: 'Doble vuelta',
        hint: 'Cada pareja se enfrenta dos veces (con los locales invertidos).',
      },
      {
        key: 'pointsWin',
        type: 'number',
        label: 'Puntos por victoria',
        min: 0,
        max: 9,
      },
      {
        key: 'pointsDraw',
        type: 'number',
        label: 'Puntos por empate',
        min: 0,
        max: 9,
      },
    ],
    reorderLabel: 'Reiniciar resultados',
    reorderMessage:
      'Reiniciar borra todos los resultados y conserva el calendario. ¿Continuar?',
    engine: roundRobin,
    view: 'round-robin',
  },
  {
    id: SWISS_ID,
    label: 'Suizo',
    description:
      'Empareja cada ronda por puntuación similar, sin eliminación directa. Ideal con muchos participantes y pocas rondas: evita revanchas y los descansos suman un punto.',
    legacyLabels: ['Suizo', 'Swiss'],
    implemented: true,
    minPlayers: 4,
    // totalRounds se omite a propósito: si el usuario no elige valor, el motor
    // aplica min(3, floor(log2(n))) al crear (ver defaultSwissTotalRounds).
    defaultOptions: { pointsWin: 3, pointsDraw: 1 },
    optionSchema: [
      {
        key: 'totalRounds',
        type: 'number',
        label: 'Número de rondas',
        hint: 'Si lo dejas vacío, se usa min(3, log₂ del número de participantes).',
        min: 1,
        max: 12,
      },
      {
        key: 'pointsWin',
        type: 'number',
        label: 'Puntos por victoria',
        min: 0,
        max: 9,
      },
      {
        key: 'pointsDraw',
        type: 'number',
        label: 'Puntos por empate',
        min: 0,
        max: 9,
      },
    ],
    reorderLabel: 'Reiniciar torneo',
    reorderMessage:
      'Reiniciar borra las rondas generadas y todo el historial de emparejamientos. ¿Continuar?',
    engine: swiss,
    view: 'swiss',
  },
]

/** @type {Map<string, FormatEntry>} */
const BY_ID = new Map(FORMATS.map((format) => [format.id, format]))

/**
 * @param {string} id
 * @returns {FormatEntry|null}
 */
export function getFormat(id) {
  if (typeof id !== 'string') return null
  return BY_ID.get(id) ?? null
}

/**
 * @param {{ onlyImplemented?: boolean }} [options]
 * @returns {FormatEntry[]}
 */
export function listFormats(options = {}) {
  return options.onlyImplemented
    ? FORMATS.filter((format) => format.implemented)
    : [...FORMATS]
}

/**
 * Resuelve un valor guardado (id de formato o etiqueta heredada) a un id de formato.
 * @param {unknown} value
 * @returns {FormatId|null}
 */
export function resolveFormatId(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (BY_ID.has(trimmed)) return /** @type {FormatId} */ (trimmed)

  const needle = trimmed.toLowerCase()
  const match = FORMATS.find((format) =>
    format.legacyLabels.some((label) => label.toLowerCase() === needle)
  )
  return match ? match.id : null
}

/**
 * @param {unknown} label
 * @returns {FormatEntry|null}
 */
export function getFormatByLabel(label) {
  const id = resolveFormatId(label)
  return id ? BY_ID.get(id) ?? null : null
}

/**
 * @param {string} id
 * @returns {string}
 */
export function formatLabel(id) {
  return getFormat(id)?.label ?? ''
}

/**
 * Normaliza las opciones de un formato a un objeto plano y serializable.
 * @param {unknown} value
 * @returns {Object}
 */
export function normalizeFormatOptions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  try {
    const plain = JSON.parse(JSON.stringify(value))
    if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return {}
    return plain
  } catch {
    return {}
  }
}
