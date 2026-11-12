import LZString from 'lz-string'
import { parsePlayers } from '../utils/players.js'

export const STORAGE_KEY = 'cbg:v1'
export const SNAPSHOT_VERSION = 1
export const SHARE_PREFIX = 'v1.'

/** @typedef {'setup' | 'competition'} AppView */

/**
 * @typedef {Object} CompetitionData
 * @property {string} tournamentName
 * @property {string} tournamentFormat
 * @property {string[]} tournamentPlayers
 */

/**
 * @typedef {Object} BracketSnapshot
 * @property {string[]} seeds
 * @property {Array<Array<{ id: string, p1: string|null, p2: string|null, winner: string|null }>>} rounds
 */

/**
 * @typedef {Object} SessionSnapshot
 * @property {number} v
 * @property {AppView} view
 * @property {CompetitionData|null} competitionData
 * @property {BracketSnapshot|null} bracket
 */

/**
 * @param {unknown} value
 * @returns {value is CompetitionData}
 */
function isCompetitionData(value) {
  if (!value || typeof value !== 'object') return false
  const data = /** @type {Record<string, unknown>} */ (value)
  if (typeof data.tournamentName !== 'string') return false
  if (typeof data.tournamentFormat !== 'string') return false
  const players = Array.isArray(data.tournamentPlayers)
    ? data.tournamentPlayers
    : typeof data.tournamentPlayers === 'string'
      ? parsePlayers(data.tournamentPlayers)
      : null
  return Array.isArray(players) && players.length >= 2
}

/**
 * @param {unknown} value
 * @returns {value is BracketSnapshot}
 */
function isBracketSnapshot(value) {
  if (!value || typeof value !== 'object') return false
  const bracket = /** @type {Record<string, unknown>} */ (value)
  if (!Array.isArray(bracket.seeds) || !Array.isArray(bracket.rounds)) return false
  return bracket.rounds.every(
    (round) =>
      Array.isArray(round) &&
      round.every(
        (match) =>
          match &&
          typeof match === 'object' &&
          typeof match.id === 'string' &&
          'p1' in match &&
          'p2' in match &&
          'winner' in match
      )
  )
}

/**
 * Normalize and validate a raw snapshot object.
 * @param {unknown} raw
 * @returns {SessionSnapshot|null}
 */
export function validateSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null
  const obj = /** @type {Record<string, unknown>} */ (raw)
  const v = Number(obj.v)
  if (v !== SNAPSHOT_VERSION) return null

  const view = obj.view === 'competition' ? 'competition' : 'setup'
  let competitionData = null

  if (obj.competitionData != null) {
    if (!isCompetitionData(obj.competitionData)) return null
    const rawData = /** @type {Record<string, unknown>} */ (obj.competitionData)
    competitionData = {
      tournamentName: String(rawData.tournamentName),
      tournamentFormat: String(rawData.tournamentFormat),
      tournamentPlayers: Array.isArray(rawData.tournamentPlayers)
        ? rawData.tournamentPlayers.map(String)
        : parsePlayers(String(rawData.tournamentPlayers)),
    }
  }

  let bracket = null
  if (obj.bracket != null) {
    if (!isBracketSnapshot(obj.bracket)) return null
    bracket = /** @type {BracketSnapshot} */ (obj.bracket)
  }

  if (view === 'competition' && !competitionData) return null

  return {
    v: SNAPSHOT_VERSION,
    view,
    competitionData,
    bracket,
  }
}

/**
 * @param {{
 *   view?: AppView,
 *   competitionData?: CompetitionData|null,
 *   bracket?: BracketSnapshot|null,
 * }} partial
 * @returns {SessionSnapshot}
 */
export function createSnapshot(partial = {}) {
  return {
    v: SNAPSHOT_VERSION,
    view: partial.view === 'competition' ? 'competition' : 'setup',
    competitionData: partial.competitionData ?? null,
    bracket: partial.bracket ?? null,
  }
}

/**
 * @param {SessionSnapshot} snapshot
 * @returns {string}
 */
export function serializeSnapshot(snapshot) {
  return JSON.stringify(snapshot)
}

/**
 * @param {string} text
 * @returns {SessionSnapshot|null}
 */
export function parseSnapshot(text) {
  try {
    return validateSnapshot(JSON.parse(text))
  } catch {
    return null
  }
}

/**
 * @param {Storage} [storage]
 * @returns {SessionSnapshot|null}
 */
export function loadFromLocalStorage(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseSnapshot(raw)
  } catch {
    return null
  }
}

/**
 * @param {SessionSnapshot} snapshot
 * @param {Storage} [storage]
 */
export function saveToLocalStorage(snapshot, storage = localStorage) {
  const valid = validateSnapshot(snapshot)
  if (!valid) return
  storage.setItem(STORAGE_KEY, serializeSnapshot(valid))
}

/**
 * Compress snapshot for URL hash payload.
 * @param {SessionSnapshot} snapshot
 * @returns {string|null}
 */
export function encodeSharePayload(snapshot) {
  const valid = validateSnapshot(snapshot)
  if (!valid) return null
  const compressed = LZString.compressToUint8Array(serializeSnapshot(valid))
  if (!compressed || !compressed.length) return null
  let binary = ''
  for (let i = 0; i < compressed.length; i += 1) {
    binary += String.fromCharCode(compressed[i])
  }
  const b64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return `${SHARE_PREFIX}${b64}`
}

/**
 * @param {string} payload
 * @returns {SessionSnapshot|null}
 */
export function decodeSharePayload(payload) {
  if (typeof payload !== 'string' || !payload.startsWith(SHARE_PREFIX)) return null
  try {
    const b64url = payload.slice(SHARE_PREFIX.length)
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const binary = atob(b64 + pad)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    const json = LZString.decompressFromUint8Array(bytes)
    if (!json) return null
    return parseSnapshot(json)
  } catch {
    return null
  }
}

/**
 * Read `#s=...` from location hash.
 * @param {string} [hash]
 * @returns {string|null}
 */
export function readShareHash(hash = typeof location !== 'undefined' ? location.hash : '') {
  const raw = String(hash || '').replace(/^#/, '')
  if (!raw) return null
  const params = new URLSearchParams(raw.includes('=') ? raw : `s=${raw}`)
  return params.get('s')
}

/**
 * Build shareable URL for current origin + path.
 * @param {SessionSnapshot} snapshot
 * @param {{ origin?: string, pathname?: string }} [opts]
 * @returns {string|null}
 */
export function buildShareUrl(snapshot, opts = {}) {
  const payload = encodeSharePayload(snapshot)
  if (!payload) return null
  const origin =
    opts.origin ??
    (typeof location !== 'undefined' ? location.origin : 'http://localhost')
  const pathname =
    opts.pathname ??
    (typeof location !== 'undefined' ? location.pathname : '/')
  return `${origin}${pathname}#s=${payload}`
}

/**
 * Clear share hash from the address bar without reloading.
 */
export function clearShareHash() {
  if (typeof history === 'undefined' || typeof location === 'undefined') return
  const { pathname, search } = location
  history.replaceState(null, '', `${pathname}${search}`)
}
