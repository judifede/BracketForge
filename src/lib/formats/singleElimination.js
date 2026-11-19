import {
  advanceWinner,
  buildBracket,
  cloneBracket,
  collectContestedWinners,
  rebuildBracketFromWinners,
  shuffleSeeds,
} from '../bracket.js'

/**
 * @typedef {import('./types.js').FormatEngine} FormatEngine
 * @typedef {import('./types.js').EngineContext} EngineContext
 * @typedef {import('../bracket.js').Bracket} Bracket
 * @typedef {import('../bracket.js').Match} Match
 */

export const SINGLE_ELIMINATION_ID = 'e'

/**
 * Índice de un participante dentro del padrón (case-insensitive).
 * @param {string[]} players
 * @param {string} name
 * @returns {number}
 */
function playerIndex(players, name) {
  const key = String(name).toLowerCase()
  return players.findIndex((player) => player.toLowerCase() === key)
}

/**
 * Busca un partido por su id dentro del bracket.
 * @param {Bracket} bracket
 * @param {string} matchId
 * @returns {Match|null}
 */
function findMatch(bracket, matchId) {
  for (const round of bracket?.rounds ?? []) {
    for (const match of round) {
      if (match.id === matchId) return match
    }
  }
  return null
}

/**
 * Motor de eliminación simple: adaptador sobre `src/lib/bracket.js`.
 * El motor original no se modifica; este archivo solo lo adapta al contrato común.
 * @type {FormatEngine}
 */
export const singleElimination = {
  id: SINGLE_ELIMINATION_ID,

  /**
   * @param {string[]} players
   * @returns {Bracket}
   */
  create(players) {
    return buildBracket(players)
  },

  /**
   * @param {Bracket} state
   * @returns {Bracket}
   */
  cloneState(state) {
    return cloneBracket(state)
  },

  /**
   * @param {Bracket} state
   * @param {string} matchId
   * @param {import('./types.js').MatchResult} result
   * @returns {Bracket}
   */
  applyResult(state, matchId, result) {
    const winner = result?.winner
    if (typeof winner !== 'string' || !winner) {
      throw new Error('El resultado debe incluir un ganador.')
    }
    return advanceWinner(state, matchId, winner)
  },

  /**
   * @param {Bracket} state
   * @param {string} matchId
   * @param {string|null} player
   * @returns {boolean}
   */
  canPick(state, matchId, player) {
    const match = findMatch(state, matchId)
    if (!match || !player) return false
    if (match.p1 == null || match.p2 == null) return false
    return match.winner !== player
  },

  /**
   * @param {Bracket} state
   * @returns {string|null}
   */
  getChampion(state) {
    const rounds = state?.rounds
    if (!rounds?.length) return null
    return rounds[rounds.length - 1][0]?.winner ?? null
  },

  /**
   * @param {Bracket} state
   * @returns {string[]}
   */
  getRoster(state) {
    return Array.isArray(state?.seeds) ? [...state.seeds] : []
  },

  /**
   * @param {Bracket} state
   * @returns {{ played: number, total: number, complete: boolean }}
   */
  getProgress(state) {
    let played = 0
    let total = 0
    for (const round of state?.rounds ?? []) {
      for (const match of round) {
        // Los partidos con descanso (bye) no se cuentan como disputados.
        if (match.p1 == null || match.p2 == null) continue
        total += 1
        if (match.winner) played += 1
      }
    }
    return { played, total, complete: total > 0 && played === total }
  },

  /**
   * @param {Bracket} state
   * @returns {Bracket}
   */
  reorder(state) {
    return buildBracket(shuffleSeeds(state.seeds))
  },

  /**
   * @param {unknown} value
   * @returns {boolean}
   */
  validateState(value) {
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
  },

  /**
   * Estado → payload compacto `{ s?, w }` con índices sobre el padrón.
   * @param {Bracket} state
   * @param {EngineContext} ctx
   * @returns {{ s?: number[], w: number[] }|null}
   */
  encode(state, ctx) {
    const players = ctx?.players
    if (!Array.isArray(players) || players.length === 0) return null

    const seedIndexes = state.seeds.map((seed) => playerIndex(players, seed))
    if (seedIndexes.some((index) => index < 0)) return null

    /** @type {number[]} */
    const winnerIndexes = []
    for (const name of collectContestedWinners(state)) {
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

    const isIdentityOrder = seedIndexes.every((index, i) => index === i)
    return {
      ...(isIdentityOrder ? {} : { s: seedIndexes }),
      w: winnerIndexes,
    }
  },

  /**
   * Payload compacto → estado.
   * @param {unknown} payload
   * @param {EngineContext} ctx
   * @returns {Bracket|null}
   */
  decode(payload, ctx) {
    if (!payload || typeof payload !== 'object') return null
    const raw = /** @type {Record<string, unknown>} */ (payload)
    const players = ctx?.players
    if (!Array.isArray(players) || players.length === 0) return null

    const seedIndexes = Array.isArray(raw.s)
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
    const winnerIndexes = Array.isArray(raw.w) ? raw.w.map((value) => Number(value)) : []
    const winnerNames = winnerIndexes.map((index) => {
      if (!Number.isInteger(index) || index < 0) return null
      if (index >= players.length) return null
      return players[index]
    })

    return rebuildBracketFromWinners(seeds, winnerNames)
  },

  /**
   * @param {string[]} players
   * @returns {{ ok: boolean, error: string|null }}
   */
  validateSetup(players) {
    if (!Array.isArray(players) || players.length < 2) {
      return { ok: false, error: 'Añade al menos 2 participantes.' }
    }
    return { ok: true, error: null }
  },
}
