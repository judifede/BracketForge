import { shuffle } from '../utils/shuffle.js'

/**
 * @typedef {object} FormTheme
 * @property {string} id
 * @property {string} label
 * @property {string[]} nameTemplates
 * @property {string[]} playerPool
 */

/** @type {readonly number[]} */
export const SIZES = Object.freeze([4, 8, 16])

/** @type {FormTheme[]} */
export const THEMES = [
  {
    id: 'futbol',
    label: 'Fútbol',
    nameTemplates: [
      'Copa Barrial',
      'Torneo Primavera FC',
      'Liga de Amigos del Parque',
      'Copa del Barrio Norte',
      'Torneo Noche de Goles',
      'Liga Indoor 5v5',
    ],
    playerPool: [
      'Carlos Rivera',
      'Mateo Vargas',
      'Diego Morales',
      'Andrés Castillo',
      'Lucas Fernández',
      'Martín Rojas',
      'Pablo Herrera',
      'Santiago López',
      'Nicolás Ruiz',
      'Tomás Álvarez',
      'Gabriel Torres',
      'Julián Méndez',
      'Sebastián Cruz',
      'Iván Domínguez',
      'Felipe Navarro',
      'Emilio Sánchez',
      'Álvaro Peña',
      'Hugo Ramírez',
      'Bruno Ortega',
      'Ricardo Silva',
    ],
  },
  {
    id: 'esports',
    label: 'Esports',
    nameTemplates: [
      'Copa Pixel Night',
      'Torneo Ranked Open',
      'Liga LAN Party',
      'Copa Split Finals',
      'Torneo de Clutches',
      'Liga de Scrims',
    ],
    playerPool: [
      'NovaStrike',
      'PixelWolf',
      'ShadowByte',
      'LagKiller',
      'AceHunter',
      'CritQueen',
      'RoguePulse',
      'NeonFox',
      'VoidRunner',
      'TurboAim',
      'GhostLan',
      'HexBlade',
      'StormPing',
      'DarkOrbit',
      'FlameCore',
      'SilentFrag',
      'CyberNeko',
      'UltraViolet',
      'RaidKing',
      'EchoShot',
    ],
  },
  {
    id: 'amigos',
    label: 'Amigos',
    nameTemplates: [
      'Torneo de la Peñita',
      'Copa After Office',
      'Liga del WhatsApp',
      'Torneo Cumpleaños',
      'Copa Fin de Semana',
      'Liga de los Domingos',
    ],
    playerPool: [
      'Ana',
      'Luis',
      'María',
      'Pedro',
      'Sofía',
      'Jorge',
      'Camila',
      'Daniel',
      'Valentina',
      'Héctor',
      'Lucía',
      'Miguel',
      'Paula',
      'Raúl',
      'Elena',
      'Óscar',
      'Claudia',
      'Fernando',
      'Isabel',
      'Manuel',
    ],
  },
]

/**
 * @param {number} maxExclusive
 * @param {() => number} random
 * @returns {number}
 */
function randomIndex(maxExclusive, random) {
  if (maxExclusive <= 0) return 0
  return Math.floor(random() * maxExclusive)
}

/**
 * @param {T[]} items
 * @param {() => number} random
 * @returns {T}
 * @template T
 */
function pickOne(items, random) {
  return items[randomIndex(items.length, random)]
}

/**
 * @param {string} themeId
 * @returns {FormTheme}
 */
export function getThemeById(themeId) {
  const theme = THEMES.find((entry) => entry.id === themeId)
  if (!theme) {
    throw new Error(`Unknown theme id: ${themeId}`)
  }
  return theme
}

/**
 * Sample `size` unique players from a theme pool (Fisher–Yates via shuffle).
 * @param {string[]} playerPool
 * @param {number} size
 * @param {() => number} [random]
 * @returns {string[]}
 */
export function samplePlayers(playerPool, size, random = Math.random) {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`Invalid size: ${size}`)
  }
  if (playerPool.length < size) {
    throw new Error(
      `Player pool has ${playerPool.length} names; need at least ${size}`
    )
  }
  return shuffle(playerPool, random).slice(0, size)
}

/**
 * Build a filled form preset for a theme + size.
 * @param {{ themeId: string, size: number, random?: () => number }} options
 * @returns {{
 *   tournamentName: string,
 *   tournamentFormat: 'Eliminación simple',
 *   tournamentPlayers: string
 * }}
 */
export function buildPreset({ themeId, size, random = Math.random }) {
  if (!SIZES.includes(size)) {
    throw new Error(`Invalid size: ${size}. Expected one of ${SIZES.join(', ')}`)
  }

  const theme = getThemeById(themeId)
  const players = samplePlayers(theme.playerPool, size, random)

  return {
    tournamentName: pickOne(theme.nameTemplates, random),
    tournamentFormat: 'Eliminación simple',
    tournamentPlayers: players.join('\n'),
  }
}

/**
 * Random theme + size + name/players for the Sorpresa button.
 * @param {{ random?: () => number }} [options]
 * @returns {{
 *   themeId: string,
 *   size: number,
 *   tournamentName: string,
 *   tournamentFormat: 'Eliminación simple',
 *   tournamentPlayers: string
 * }}
 */
export function buildSurprisePreset({ random = Math.random } = {}) {
  const theme = pickOne(THEMES, random)
  const size = pickOne([...SIZES], random)
  const preset = buildPreset({ themeId: theme.id, size, random })

  return {
    themeId: theme.id,
    size,
    ...preset,
  }
}
