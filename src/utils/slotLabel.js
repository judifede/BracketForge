/**
 * Spanish UI copy for empty bracket slots.
 * Internal domain may use null / BYE; never show the English word "BYE".
 *
 * @param {number} roundIndex 0-based round (0 = first round, where padding byes live)
 * @returns {string}
 */
export function emptySlotLabel(roundIndex) {
  // First-round nulls are automatic rest / bye padding
  if (roundIndex === 0) return 'Descanso'
  // Later rounds wait for a previous-match winner
  return 'Por definir'
}

/**
 * @param {string|undefined|null} matchId e.g. "r0-m1"
 * @returns {number} round index, or -1 if unknown
 */
export function roundIndexFromMatchId(matchId) {
  const m = /^r(\d+)/.exec(matchId || '')
  return m ? Number(m[1]) : -1
}

/**
 * @param {string|null|undefined} player
 * @param {number|{ id?: string|null, p1?: string|null, p2?: string|null, winner?: string|null }} roundOrMatch
 *        Round index, or a match object (uses id / bye heuristic as fallback).
 * @returns {string}
 */
export function playerSlotLabel(player, roundOrMatch) {
  if (player != null && player !== '') return player

  if (typeof roundOrMatch === 'number') {
    return emptySlotLabel(roundOrMatch)
  }

  const match = roundOrMatch
  const fromId = roundIndexFromMatchId(match?.id)
  if (fromId >= 0) return emptySlotLabel(fromId)

  // Fallback without id: bye rest when the other side already auto-advanced
  const other = match?.p1 != null ? match.p1 : match?.p2
  if (other != null && match?.winner === other) return 'Descanso'

  return 'Por definir'
}
