import capitalize from './utils.js'
import { validatePlayersInput, serializePlayers } from './players.js'
import {
  getFormat,
  normalizeFormatOptions,
  resolveFormatId,
} from '../lib/formats/index.js'

/**
 * Validate competition name field.
 * @param {unknown} name
 * @returns {{ ok: boolean, value: string, error: string|null }}
 */
export function validateTournamentName(name) {
  const value = capitalize(name)
  if (!value) {
    return {
      ok: false,
      value: '',
      error: 'El nombre es obligatorio.',
    }
  }
  return { ok: true, value, error: null }
}

/**
 * Validate the full setup form payload.
 * @param {{
 *   tournamentName?: unknown,
 *   tournamentFormat?: unknown,
 *   tournamentPlayers?: string|string[],
 *   tournamentOptions?: unknown,
 *   maxPlayers?: number,
 * }} fields
 * @returns {{
 *   ok: boolean,
 *   error: string|null,
 *   warning?: string|null,
 *   data: {
 *     tournamentName: string,
 *     tournamentFormat: string,
 *     tournamentPlayers: string[],
 *     tournamentOptions: Object,
 *   } | null,
 *   playersResult: ReturnType<typeof validatePlayersInput>,
 *   nameResult: ReturnType<typeof validateTournamentName>,
 * }}
 */
export function validateCompetitionForm(fields) {
  const nameResult = validateTournamentName(fields.tournamentName)
  const playersResult = validatePlayersInput(fields.tournamentPlayers, {
    max: fields.maxPlayers,
  })

  if (!nameResult.ok || !playersResult.ok) {
    return {
      ok: false,
      error: !nameResult.ok
        ? nameResult.error
        : playersResult.error || 'Revisa los participantes.',
      data: null,
      playersResult,
      nameResult,
    }
  }

  const formatId = resolveFormatId(fields.tournamentFormat) ?? 'e'
  const format = getFormat(formatId)

  if (!format) {
    return {
      ok: false,
      error: 'Formato de torneo desconocido.',
      data: null,
      playersResult,
      nameResult,
    }
  }

  // Defaults del registro + overrides del formulario (opciones incompletas
  // no deben llegar a create() sin p. ej. pointsWin).
  const tournamentOptions = {
    ...(format.defaultOptions ?? {}),
    ...normalizeFormatOptions(fields.tournamentOptions),
  }

  // Cada motor define sus propias reglas de setup (mínimo de participantes, etc.).
  const setupResult = format.engine.validateSetup(
    playersResult.players,
    tournamentOptions
  )

  if (!setupResult.ok) {
    return {
      ok: false,
      error: setupResult.error || 'Revisa los participantes.',
      data: null,
      playersResult,
      nameResult,
    }
  }

  return {
    ok: true,
    error: null,
    warning: setupResult.warning ?? null,
    data: {
      tournamentName: nameResult.value,
      tournamentFormat: formatId,
      tournamentPlayers: playersResult.players,
      tournamentOptions,
    },
    playersResult,
    nameResult,
  }
}

/**
 * Text whether modal "Actualizar" can submit.
 * @param {string|string[]} playersInput
 * @returns {boolean}
 */
export function canSubmitPlayersUpdate(playersInput) {
  return validatePlayersInput(playersInput).ok
}

export { serializePlayers, validatePlayersInput }
