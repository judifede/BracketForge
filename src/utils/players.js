import { normalizeWhitespace } from './utils.js'

/**
 * Normalize a player name (trim + collapse spaces; preserve casing).
 * @param {unknown} name
 * @returns {string}
 */
export function normalizeName(name) {
  if (name == null) return ''
  return normalizeWhitespace(String(name))
}

/**
 * Split raw text on commas or newlines into name segments.
 * @param {string} text
 * @returns {string[]}
 */
function splitPlayerText(text) {
  return String(text)
    .split(/[,\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Deduplicate names case-insensitively, keeping first normalized form.
 * @param {string[]} names
 * @returns {{ players: string[], hadDuplicates: boolean }}
 */
export function dedupePlayers(names) {
  const seen = new Set()
  const players = []
  let hadDuplicates = false

  for (const name of names) {
    const key = name.toLowerCase()
    if (seen.has(key)) {
      hadDuplicates = true
      continue
    }
    seen.add(key)
    players.push(name)
  }

  return { players, hadDuplicates }
}

/**
 * Parse a comma/newline-separated string or array into a clean player list.
 * @param {string|string[]} input
 * @returns {string[]}
 */
export function parsePlayers(input) {
  if (Array.isArray(input)) {
    return dedupePlayers(input.map(normalizeName).filter(Boolean)).players
  }
  if (typeof input !== 'string') return []
  return dedupePlayers(splitPlayerText(input).map(normalizeName).filter(Boolean))
    .players
}

/**
 * Serialize a player array for textarea display.
 * @param {string[]} players
 * @returns {string}
 */
export function serializePlayers(players) {
  if (!Array.isArray(players)) return ''
  return players.filter(Boolean).join('\n')
}

/**
 * Validate free-text player input for forms.
 * @param {string|string[]} input
 * @param {{ min?: number, max?: number }} [options]
 * @returns {{
 *   ok: boolean,
 *   players: string[],
 *   error: string|null,
 *   hadDuplicates: boolean,
 *   overMax: boolean,
 * }}
 */
export function validatePlayersInput(input, options = {}) {
  const min = options.min ?? 2
  const max =
    typeof options.max === 'number' && options.max > 0 ? options.max : null
  let rawNames = []
  let hadDuplicates = false

  if (Array.isArray(input)) {
    rawNames = input.map(normalizeName).filter(Boolean)
  } else if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed === '') {
      return {
        ok: false,
        players: [],
        error: 'Añade al menos 2 participantes.',
        hadDuplicates: false,
        overMax: false,
      }
    }
    rawNames = splitPlayerText(trimmed).map(normalizeName).filter(Boolean)
  } else {
    return {
      ok: false,
      players: [],
      error: 'Añade al menos 2 participantes.',
      hadDuplicates: false,
      overMax: false,
    }
  }

  const deduped = dedupePlayers(rawNames)
  hadDuplicates = deduped.hadDuplicates
  const players = deduped.players
  const overMax = max != null && players.length > max

  if (players.length < min) {
    return {
      ok: false,
      players,
      error:
        players.length === 0
          ? 'Añade al menos 2 participantes.'
          : `Se necesitan al menos ${min} participantes (ahora: ${players.length}).`,
      hadDuplicates,
      overMax,
    }
  }

  if (overMax) {
    return {
      ok: false,
      players,
      error: `Máximo ${max} participantes (ahora: ${players.length}).`,
      hadDuplicates,
      overMax: true,
    }
  }

  return {
    ok: true,
    players,
    error: hadDuplicates
      ? 'Se omitieron nombres duplicados.'
      : null,
    hadDuplicates,
    overMax: false,
  }
}
