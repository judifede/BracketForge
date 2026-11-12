import LZString from 'lz-string'
import { parsePlayers } from '../utils/players.js'
import {
  collectContestedWinners,
  rebuildBracketFromWinners,
} from './bracket.js'

export const STORAGE_KEY = 'cbg:v1'
export const SNAPSHOT_VERSION = 1
export const SHARE_PREFIX = 'v1.'
export const SHARE_PREFIX_V2 = 'v2.'

const FORMAT_TO_CODE = {
  'Eliminación simple': 'e',
}

const CODE_TO_FORMAT = {
  e: 'Eliminación simple',
}

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
 * @typedef {Object} CompactShare
 * @property {2} v
 * @property {'s'|'c'} view
 * @property {string} [n]
 * @property {string} [f]
 * @property {string[]} [p]
 * @property {number[]} [s]
 * @property {number[]} [w]
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
 * @param {string} format
 * @returns {string}
 */
function formatToCode(format) {
  return FORMAT_TO_CODE[format] ?? 'e'
}

/**
 * @param {unknown} code
 * @returns {string}
 */
function codeToFormat(code) {
  if (typeof code !== 'string') return CODE_TO_FORMAT.e
  return CODE_TO_FORMAT[code] ?? CODE_TO_FORMAT.e
}

/**
 * @param {string[]} players
 * @param {string} name
 * @returns {number}
 */
function playerIndex(players, name) {
  const key = String(name).toLowerCase()
  return players.findIndex((player) => player.toLowerCase() === key)
}

/**
 * @param {string[]} players
 * @returns {boolean}
 */
function isIdentitySeedOrder(players, seedIndexes) {
  if (seedIndexes.length !== players.length) return false
  return seedIndexes.every((index, i) => index === i)
}

/**
 * Compact a validated snapshot for share URLs.
 * @param {SessionSnapshot} snapshot
 * @returns {CompactShare|null}
 */
export function toCompactShare(snapshot) {
  const valid = validateSnapshot(snapshot)
  if (!valid) return null

  /** @type {CompactShare} */
  const compact = {
    v: 2,
    view: valid.view === 'competition' ? 'c' : 's',
  }

  if (valid.competitionData) {
    const players = valid.competitionData.tournamentPlayers.map(String)
    compact.n = valid.competitionData.tournamentName
    compact.f = formatToCode(valid.competitionData.tournamentFormat)
    compact.p = players

    if (valid.bracket && Array.isArray(valid.bracket.seeds)) {
      const seedIndexes = valid.bracket.seeds.map((seed) =>
        playerIndex(players, seed)
      )
      if (seedIndexes.some((index) => index < 0)) return null
      if (!isIdentitySeedOrder(players, seedIndexes)) {
        compact.s = seedIndexes
      }

      const winnerNames = collectContestedWinners(valid.bracket)
      /** @type {number[]} */
      const winnerIndexes = []
      for (const name of winnerNames) {
        if (name == null) {
          winnerIndexes.push(-1)
          continue
        }
        const index = playerIndex(players, name)
        if (index < 0) return null
        winnerIndexes.push(index)
      }
      while (
        winnerIndexes.length > 0 &&
        winnerIndexes[winnerIndexes.length - 1] < 0
      ) {
        winnerIndexes.pop()
      }
      // Always include w when a bracket exists so decode rebuilds it (even with no picks).
      compact.w = winnerIndexes
    }
  } else if (valid.view === 'competition') {
    return null
  }

  return compact
}

/**
 * Expand a compact share payload into a session snapshot.
 * @param {unknown} compact
 * @returns {SessionSnapshot|null}
 */
export function fromCompactShare(compact) {
  if (!compact || typeof compact !== 'object') return null
  const raw = /** @type {Record<string, unknown>} */ (compact)
  if (Number(raw.v) !== 2) return null

  const view = raw.view === 'c' ? 'competition' : 'setup'
  const players = Array.isArray(raw.p) ? raw.p.map(String) : []

  let competitionData = null
  if (players.length >= 2 && typeof raw.n === 'string') {
    competitionData = {
      tournamentName: raw.n,
      tournamentFormat: codeToFormat(raw.f),
      tournamentPlayers: players,
    }
  }

  if (view === 'competition' && !competitionData) return null

  let bracket = null
  if (competitionData && (Array.isArray(raw.s) || Array.isArray(raw.w))) {
    let seedIndexes = Array.isArray(raw.s)
      ? raw.s.map((value) => Number(value))
      : players.map((_, i) => i)

    if (
      seedIndexes.length !== players.length ||
      seedIndexes.some(
        (index) =>
          !Number.isInteger(index) || index < 0 || index >= players.length
      )
    ) {
      return null
    }

    const seeds = seedIndexes.map((index) => players[index])
    const winnerIndexes = Array.isArray(raw.w)
      ? raw.w.map((value) => Number(value))
      : []
    const winnerNames = winnerIndexes.map((index) => {
      if (!Number.isInteger(index) || index < 0) return null
      if (index >= players.length) return null
      return players[index]
    })

    bracket = rebuildBracketFromWinners(seeds, winnerNames)
  }

  return validateSnapshot({
    v: SNAPSHOT_VERSION,
    view,
    competitionData,
    bracket,
  })
}

/**
 * @param {string} json
 * @returns {string|null}
 */
function compressJsonToB64url(json) {
  const compressed = LZString.compressToUint8Array(json)
  if (!compressed || !compressed.length) return null
  let binary = ''
  for (let i = 0; i < compressed.length; i += 1) {
    binary += String.fromCharCode(compressed[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

/**
 * @param {string} b64url
 * @returns {string|null}
 */
function decompressB64urlToJson(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const binary = atob(b64 + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return LZString.decompressFromUint8Array(bytes) || null
}

/**
 * Legacy v1 encoder (full snapshot JSON). Kept for tests / compatibility tooling.
 * @param {SessionSnapshot} snapshot
 * @returns {string|null}
 */
export function encodeSharePayloadV1(snapshot) {
  const valid = validateSnapshot(snapshot)
  if (!valid) return null
  const b64 = compressJsonToB64url(serializeSnapshot(valid))
  if (!b64) return null
  return `${SHARE_PREFIX}${b64}`
}

/**
 * Compress snapshot for URL hash payload (compact v2).
 * @param {SessionSnapshot} snapshot
 * @returns {string|null}
 */
export function encodeSharePayload(snapshot) {
  const compact = toCompactShare(snapshot)
  if (!compact) return null
  const b64 = compressJsonToB64url(JSON.stringify(compact))
  if (!b64) return null
  return `${SHARE_PREFIX_V2}${b64}`
}

/**
 * @param {string} payload
 * @returns {SessionSnapshot|null}
 */
export function decodeSharePayload(payload) {
  if (typeof payload !== 'string') return null

  try {
    if (payload.startsWith(SHARE_PREFIX_V2)) {
      const json = decompressB64urlToJson(payload.slice(SHARE_PREFIX_V2.length))
      if (!json) return null
      return fromCompactShare(JSON.parse(json))
    }

    if (payload.startsWith(SHARE_PREFIX)) {
      const json = decompressB64urlToJson(payload.slice(SHARE_PREFIX.length))
      if (!json) return null
      return parseSnapshot(json)
    }
  } catch {
    return null
  }

  return null
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
 * Clear share hash from the address bar without reloading (long v1/v2 payloads only).
 */
export function clearShareHash() {
  if (typeof history === 'undefined' || typeof location === 'undefined') return
  const { pathname, search } = location
  history.replaceState(null, '', `${pathname}${search}`)
}
