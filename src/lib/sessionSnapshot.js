import LZString from 'lz-string'
import { parsePlayers } from '../utils/players.js'
import {
  getFormat,
  normalizeFormatOptions,
  resolveFormatId,
} from './formats/index.js'

export const STORAGE_KEY = 'cbg:v2'
export const LEGACY_STORAGE_KEY = 'cbg:v1'
export const SNAPSHOT_VERSION = 2
export const LEGACY_SNAPSHOT_VERSION = 1
export const SHARE_PREFIX = 'v1.'
export const SHARE_PREFIX_V2 = 'v2.'
export const SHARE_PREFIX_V3 = 'v3.'

/** Códigos de formato de los enlaces v2 (solo eliminación simple). */
const LEGACY_CODE_TO_FORMAT = {
  e: 'Eliminación simple',
}

/** @typedef {'setup' | 'competition'} AppView */

/**
 * @typedef {Object} CompetitionData
 * @property {string} tournamentName
 * @property {string} tournamentFormat Id de formato (`e`, `d`, `r`, `s`).
 * @property {string[]} tournamentPlayers
 * @property {Object} tournamentOptions Opciones del formato.
 */

/**
 * Estado de un torneo: `{ format, data }` donde `data` es el estado del motor.
 *
 * @typedef {Object} TournamentState
 * @property {string} format
 * @property {Object} data
 */

/**
 * @typedef {Object} SessionSnapshot
 * @property {number} v
 * @property {AppView} view
 * @property {CompetitionData|null} competitionData
 * @property {TournamentState|null} state
 */

/**
 * @typedef {Object} CompactShare
 * @property {3} v
 * @property {'s'|'c'} view
 * @property {string} [n]
 * @property {string} [f]
 * @property {string[]} [p]
 * @property {Object} [o]
 * @property {unknown} [x]
 */

/**
 * Normaliza `competitionData`: id de formato, participantes y opciones planas.
 * @param {unknown} raw
 * @returns {CompetitionData|null}
 */
export function normalizeCompetitionData(raw) {
  if (!raw || typeof raw !== 'object') return null
  const data = /** @type {Record<string, unknown>} */ (raw)
  if (typeof data.tournamentName !== 'string') return null

  const formatId = resolveFormatId(data.tournamentFormat)
  if (!formatId) return null

  const players = Array.isArray(data.tournamentPlayers)
    ? data.tournamentPlayers.map(String)
    : typeof data.tournamentPlayers === 'string'
      ? parsePlayers(data.tournamentPlayers)
      : null
  if (!Array.isArray(players) || players.length < 2) return null

  return {
    tournamentName: String(data.tournamentName),
    tournamentFormat: formatId,
    tournamentPlayers: players,
    tournamentOptions: normalizeFormatOptions(data.tournamentOptions),
  }
}

/**
 * Normaliza el estado de torneo. Acepta el shape nuevo `{ format, data }`
 * y, por compatibilidad, un bracket legacy `{ seeds, rounds }`.
 * @param {unknown} raw
 * @returns {TournamentState|null}
 */
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return null
  const value = /** @type {Record<string, unknown>} */ (raw)

  if (typeof value.format === 'string' && value.data) {
    const format = getFormat(value.format)
    if (!format) return null
    if (!format.engine.validateState(value.data)) return null
    return { format: format.id, data: value.data }
  }

  // Shape legacy: bracket de eliminación simple.
  const single = getFormat('e')
  if (!single?.engine.validateState(value)) return null
  return { format: single.id, data: value }
}

/**
 * Normaliza y valida un snapshot en bruto (acepta v1 y v2).
 * @param {unknown} raw
 * @returns {SessionSnapshot|null}
 */
export function validateSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null
  const obj = /** @type {Record<string, unknown>} */ (raw)
  const v = Number(obj.v)
  if (v === LEGACY_SNAPSHOT_VERSION) return migrateLegacySnapshot(obj)
  if (v !== SNAPSHOT_VERSION) return null

  const view = obj.view === 'competition' ? 'competition' : 'setup'

  let competitionData = null
  if (obj.competitionData != null) {
    competitionData = normalizeCompetitionData(obj.competitionData)
    if (!competitionData) return null
  }

  let state = null
  if (obj.state != null) {
    state = normalizeState(obj.state)
    if (!state) return null
  }

  if (view === 'competition' && !competitionData) return null

  // Estado de otro formato no se puede decodificar/aplicar: se descarta.
  if (
    state &&
    competitionData &&
    state.format !== competitionData.tournamentFormat
  ) {
    state = null
  }

  return {
    v: SNAPSHOT_VERSION,
    view,
    competitionData,
    state,
  }
}

/**
 * Migra un snapshot v1 (`bracket` plano) al shape v2 (`state` con formato).
 * @param {Record<string, unknown>} obj
 * @returns {SessionSnapshot|null}
 */
function migrateLegacySnapshot(obj) {
  const view = obj.view === 'competition' ? 'competition' : 'setup'

  let competitionData = null
  if (obj.competitionData != null) {
    competitionData = normalizeCompetitionData(obj.competitionData)
    if (!competitionData) return null
  }

  let state = null
  if (obj.bracket != null) {
    state = normalizeState(obj.bracket)
    if (!state) return null
  }

  if (view === 'competition' && !competitionData) return null

  if (
    state &&
    competitionData &&
    state.format !== competitionData.tournamentFormat
  ) {
    state = null
  }

  return {
    v: SNAPSHOT_VERSION,
    view,
    competitionData,
    state,
  }
}

/**
 * @param {{
 *   view?: AppView,
 *   competitionData?: CompetitionData|null,
 *   state?: TournamentState|null,
 *   bracket?: unknown,
 * }} partial
 * @returns {SessionSnapshot}
 */
export function createSnapshot(partial = {}) {
  const competitionData = partial.competitionData
    ? normalizeCompetitionData(partial.competitionData)
    : null

  const rawState =
    partial.state != null
      ? partial.state
      : partial.bracket != null
        ? { format: 'e', data: partial.bracket }
        : null

  let state = normalizeState(rawState)
  if (
    state &&
    competitionData &&
    state.format !== competitionData.tournamentFormat
  ) {
    state = null
  }

  return {
    v: SNAPSHOT_VERSION,
    view: partial.view === 'competition' ? 'competition' : 'setup',
    competitionData,
    state,
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
    if (raw) {
      const parsed = parseSnapshot(raw)
      if (parsed) return parsed
    }

    // Sesiones guardadas con la versión anterior del formato.
    const legacy = storage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return null
    return parseSnapshot(legacy)
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
 * Compact a validated snapshot for share URLs (v3).
 * `x` es el payload opaco del motor de formato.
 * @param {SessionSnapshot} snapshot
 * @returns {CompactShare|null}
 */
export function toCompactShare(snapshot) {
  const valid = validateSnapshot(snapshot)
  if (!valid) return null

  /** @type {CompactShare} */
  const compact = {
    v: 3,
    view: valid.view === 'competition' ? 'c' : 's',
  }

  if (valid.competitionData) {
    const players = valid.competitionData.tournamentPlayers.map(String)
    compact.n = valid.competitionData.tournamentName
    compact.f = valid.competitionData.tournamentFormat
    compact.p = players

    const options = valid.competitionData.tournamentOptions
    if (options && Object.keys(options).length > 0) compact.o = options

    if (valid.state) {
      const format = getFormat(valid.state.format)
      if (!format) return null
      const encoded = format.engine.encode(valid.state.data, {
        players,
        options: valid.competitionData.tournamentOptions,
      })
      if (encoded == null) return null
      compact.x = encoded
    }
  } else if (valid.view === 'competition') {
    return null
  }

  return compact
}

/**
 * Expande un payload compacto v3 en un snapshot de sesión.
 * @param {unknown} compact
 * @returns {SessionSnapshot|null}
 */
export function fromCompactShare(compact) {
  if (!compact || typeof compact !== 'object') return null
  const raw = /** @type {Record<string, unknown>} */ (compact)
  const v = Number(raw.v)
  if (v === 2) return fromLegacyCompactShare(raw)
  if (v !== 3) return null

  const view = raw.view === 'c' ? 'competition' : 'setup'
  const players = Array.isArray(raw.p) ? raw.p.map(String) : []

  let competitionData = null
  if (players.length >= 2 && typeof raw.n === 'string') {
    competitionData = {
      tournamentName: raw.n,
      tournamentFormat: resolveFormatId(raw.f) ?? 'e',
      tournamentPlayers: players,
      tournamentOptions: normalizeFormatOptions(raw.o),
    }
  }

  if (view === 'competition' && !competitionData) return null

  let state = null
  if (competitionData && raw.x != null) {
    const format = getFormat(competitionData.tournamentFormat)
    if (!format) return null
    const data = format.engine.decode(raw.x, {
      players,
      options: competitionData.tournamentOptions,
    })
    if (!data) return null
    state = { format: format.id, data }
  }

  return validateSnapshot({
    v: SNAPSHOT_VERSION,
    view,
    competitionData,
    state,
  })
}

/**
 * Expande un payload compacto v2 (solo eliminación simple).
 * @param {Record<string, unknown>} raw
 * @returns {SessionSnapshot|null}
 */
function fromLegacyCompactShare(raw) {
  const view = raw.view === 'c' ? 'competition' : 'setup'
  const players = Array.isArray(raw.p) ? raw.p.map(String) : []

  let competitionData = null
  if (players.length >= 2 && typeof raw.n === 'string') {
    competitionData = {
      tournamentName: raw.n,
      tournamentFormat:
        resolveFormatId(
          typeof raw.f === 'string' ? LEGACY_CODE_TO_FORMAT[raw.f] : undefined
        ) ?? 'e',
      tournamentPlayers: players,
      tournamentOptions: {},
    }
  }

  if (view === 'competition' && !competitionData) return null

  let state = null
  if (competitionData && (Array.isArray(raw.s) || Array.isArray(raw.w))) {
    const format = getFormat('e')
    const data = format?.engine.decode(
      { s: raw.s, w: raw.w },
      { players }
    )
    if (!data) return null
    state = { format: format.id, data }
  }

  return validateSnapshot({
    v: SNAPSHOT_VERSION,
    view,
    competitionData,
    state,
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
  const legacy = {
    v: LEGACY_SNAPSHOT_VERSION,
    view: valid.view,
    competitionData: valid.competitionData,
    bracket: valid.state?.format === 'e' ? valid.state.data : null,
  }
  const b64 = compressJsonToB64url(JSON.stringify(legacy))
  if (!b64) return null
  return `${SHARE_PREFIX}${b64}`
}

/**
 * Compress snapshot for URL hash payload (compact v3).
 * @param {SessionSnapshot} snapshot
 * @returns {string|null}
 */
export function encodeSharePayload(snapshot) {
  const compact = toCompactShare(snapshot)
  if (!compact) return null
  const b64 = compressJsonToB64url(JSON.stringify(compact))
  if (!b64) return null
  return `${SHARE_PREFIX_V3}${b64}`
}

/**
 * @param {string} payload
 * @returns {SessionSnapshot|null}
 */
export function decodeSharePayload(payload) {
  if (typeof payload !== 'string') return null

  try {
    if (payload.startsWith(SHARE_PREFIX_V3)) {
      const json = decompressB64urlToJson(payload.slice(SHARE_PREFIX_V3.length))
      if (!json) return null
      return fromCompactShare(JSON.parse(json))
    }

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
 * Clear share hash from the address bar without reloading (long v1/v2/v3 payloads only).
 */
export function clearShareHash() {
  if (typeof history === 'undefined' || typeof location === 'undefined') return
  const { pathname, search } = location
  history.replaceState(null, '', `${pathname}${search}`)
}
