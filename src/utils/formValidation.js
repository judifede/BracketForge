import capitalize from './utils.js'
import { validatePlayersInput, serializePlayers } from './players.js'

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
 *   tournamentType?: unknown,
 *   tournamentFormat?: unknown,
 *   tournamentPlayers?: string|string[],
 *   maxPlayers?: number,
 * }} fields
 * @returns {{
 *   ok: boolean,
 *   error: string|null,
 *   data: {
 *     tournamentName: string,
 *     tournamentType: string,
 *     tournamentFormat: string,
 *     tournamentPlayers: string[],
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

  return {
    ok: true,
    error: null,
    data: {
      tournamentName: nameResult.value,
      tournamentType: String(fields.tournamentType || 'Torneo'),
      tournamentFormat: String(fields.tournamentFormat || 'Eliminación simple'),
      tournamentPlayers: playersResult.players,
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
