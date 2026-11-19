import { nextPowerOfTwo, roundLabel } from '../bracket.js'
import { shuffleSeeds } from '../bracket.js'

/**
 * @typedef {import('./types.js').FormatEngine} FormatEngine
 * @typedef {import('./types.js').EngineContext} EngineContext
 */

/**
 * Estado de un slot alimentador.
 *
 * `absent`  → no habrá participante (descanso real).
 * `pending` → habrá participante, pero su partido alimentador no está decidido.
 * `filled`  → ya hay participante.
 *
 * @typedef {{ value: string|null, state: 'absent'|'pending'|'filled' }} Slot
 */

/** @type {Slot} */
const ABSENT = { value: null, state: 'absent' }
/** @type {Slot} */
const PENDING = { value: null, state: 'pending' }

/**
 * @param {string} value
 * @returns {Slot}
 */
function filled(value) {
  return { value, state: 'filled' }
}

/**
 * Estado de un partido resuelto.
 * `empty` → sin participantes · `bye` → avance automático · `decided` · `pending`.
 *
 * @typedef {Object} DeMatch
 * @property {string} id
 * @property {string|null} p1
 * @property {string|null} p2
 * @property {string|null} winner
 * @property {'empty'|'bye'|'decided'|'pending'} status
 */

export const DOUBLE_ELIMINATION_ID = 'd'

/**
 * Nº de rondas del bracket de perdedores: `2(k-1)` para un cuadro de `2^k`.
 * @param {number} k
 * @returns {number}
 */
function losersRoundCount(k) {
  return Math.max(0, 2 * (k - 1))
}

/**
 * Nº de partidos de una ronda del bracket de perdedores.
 * @param {number} size
 * @param {number} round 1-based
 * @returns {number}
 */
function losersRoundMatchCount(size, round) {
  return size / 2 ** (Math.ceil(round / 2) + 1)
}

/**
 * Estructura estática del torneo (no depende de los resultados).
 *
 * @param {string[]} seeds
 * @returns {{
 *   size: number,
 *   k: number,
 *   winners: Array<Array<{ id: string, p1: string|null, p2: string|null }>>,
 *   losers: Array<Array<{ id: string }>>,
 *   grandFinal: Array<{ id: string }>,
 * }}
 */
export function buildDoubleEliminationStructure(seeds) {
  const roster = seeds.filter(Boolean)
  const size = nextPowerOfTwo(Math.max(roster.length, 2))
  const k = Math.log2(size)

  /** @type {Array<Array<{ id: string, p1: string|null, p2: string|null }>>} */
  const winners = []
  for (let r = 0; r < k; r += 1) {
    const count = size / 2 ** (r + 1)
    const round = []
    for (let m = 0; m < count; m += 1) {
      round.push({ id: `wb-r${r}-m${m}`, p1: null, p2: null })
    }
    winners.push(round)
  }

  // Primera ronda: las semillas en orden; el resto son descansos al final.
  for (let m = 0; m < winners[0].length; m += 1) {
    winners[0][m].p1 = roster[m * 2] ?? null
    winners[0][m].p2 = roster[m * 2 + 1] ?? null
  }

  /** @type {Array<Array<{ id: string }>>} */
  const losers = []
  const lbRounds = losersRoundCount(k)
  for (let l = 1; l <= lbRounds; l += 1) {
    const count = losersRoundMatchCount(size, l)
    const round = []
    for (let m = 0; m < count; m += 1) {
      round.push({ id: `lb-r${l - 1}-m${m}` })
    }
    losers.push(round)
  }

  return {
    size,
    k,
    winners,
    losers,
    grandFinal: [{ id: 'gf-m0' }],
  }
}

/**
 * Perdedor de un partido resuelto (null si no hubo DOS participantes).
 * @param {DeMatch} match
 * @returns {string|null}
 */
function loserOf(match) {
  if (!match.winner) return null
  if (match.p1 == null || match.p2 == null) return null
  return match.winner === match.p1 ? match.p2 : match.p1
}

/**
 * Slot del ganador de un partido, según su estado.
 * @param {DeMatch} match
 * @returns {Slot}
 */
function winnerSlot(match) {
  if (!match) return ABSENT
  if (match.status === 'empty') return ABSENT
  if (match.status === 'bye' || match.status === 'decided') {
    return filled(match.winner)
  }
  return PENDING
}

/**
 * Slot del perdedor de un partido (la "caída" al bracket de perdedores).
 * Un partido con descanso no genera perdedor: el slot queda ausente.
 * @param {DeMatch} match
 * @returns {Slot}
 */
function loserSlot(match) {
  if (!match) return ABSENT
  if (match.status === 'empty' || match.status === 'bye') return ABSENT
  if (match.status === 'decided') return filled(loserOf(match))
  return PENDING
}

/**
 * Resuelve un partido a partir de sus dos slots alimentadores.
 *
 * - ambos ausentes  → partido vacío (no existe).
 * - uno ausente    → avance automático si el otro ya está decidido.
 * - ambos presentes → gana el resultado guardado.
 *
 * @param {{ id: string }} base
 * @param {Slot} p1Slot
 * @param {Slot} p2Slot
 * @param {Record<string, { winner: string }>} results
 * @param {Record<string, { winner: string }>} pruned
 * @returns {DeMatch}
 */
function resolveMatch(base, p1Slot, p2Slot, results, pruned) {
  /** @type {DeMatch} */
  const match = {
    id: base.id,
    p1: p1Slot.state === 'filled' ? p1Slot.value : null,
    p2: p2Slot.state === 'filled' ? p2Slot.value : null,
    winner: null,
    status: 'pending',
    contested: false,
  }

  const p1Present = p1Slot.state !== 'absent'
  const p2Present = p2Slot.state !== 'absent'

  if (!p1Present && !p2Present) {
    match.status = 'empty'
    return match
  }

  if (!p1Present || !p2Present) {
    const present = p1Present ? p1Slot : p2Slot
    if (present.state === 'filled') {
      match.winner = present.value
      match.status = 'bye'
    }
    return match
  }

  match.contested = true

  if (p1Slot.state === 'pending' || p2Slot.state === 'pending') {
    return match
  }

  const stored = results[base.id]
  if (stored && (stored.winner === match.p1 || stored.winner === match.p2)) {
    match.winner = stored.winner
    match.status = 'decided'
    pruned[base.id] = stored
  }
  return match
}

/**
 * Resuelve el bracket de ganadores.
 * @param {ReturnType<typeof buildDoubleEliminationStructure>} structure
 * @param {Record<string, { winner: string }>} results
 * @param {Record<string, { winner: string }>} pruned
 * @returns {DeMatch[][]}
 */
function resolveWinners(structure, results, pruned) {
  /** @type {DeMatch[][]} */
  const resolved = []

  for (let r = 0; r < structure.winners.length; r += 1) {
    const round = []
    for (let m = 0; m < structure.winners[r].length; m += 1) {
      const base = structure.winners[r][m]
      let p1Slot = ABSENT
      let p2Slot = ABSENT

      if (r === 0) {
        p1Slot = base.p1 == null ? ABSENT : filled(base.p1)
        p2Slot = base.p2 == null ? ABSENT : filled(base.p2)
      } else {
        p1Slot = winnerSlot(resolved[r - 1][m * 2])
        p2Slot = winnerSlot(resolved[r - 1][m * 2 + 1])
      }

      round.push(resolveMatch(base, p1Slot, p2Slot, results, pruned))
    }
    resolved.push(round)
  }
  return resolved
}

/**
 * Resuelve el bracket de perdedores.
 *
 * Reglas de emparejamiento (ver docs/features/tournament-formats-implementation-plan.md):
 *  · ronda 1: perdedores de WB r1 (2m, 2m+1)
 *  · ronda par 2j: ganador de LB 2j-1 (m) vs perdedor de WB ronda j+1 (m)
 *  · ronda impar >1: ganadores de LB ℓ-1 (2m, 2m+1)
 *
 * @param {ReturnType<typeof buildDoubleEliminationStructure>} structure
 * @param {DeMatch[][]} wbResolved
 * @param {Record<string, { winner: string }>} results
 * @param {Record<string, { winner: string }>} pruned
 * @returns {DeMatch[][]}
 */
function resolveLosers(structure, wbResolved, results, pruned) {
  /** @type {DeMatch[][]} */
  const resolved = []

  for (let l = 1; l <= structure.losers.length; l += 1) {
    const round = []
    for (let m = 0; m < structure.losers[l - 1].length; m += 1) {
      let p1Slot = ABSENT
      let p2Slot = ABSENT

      if (l === 1) {
        p1Slot = loserSlot(wbResolved[0]?.[m * 2])
        p2Slot = loserSlot(wbResolved[0]?.[m * 2 + 1])
      } else if (l % 2 === 0) {
        const j = l / 2
        p1Slot = winnerSlot(resolved[l - 2][m])
        p2Slot = loserSlot(wbResolved[j]?.[m])
      } else {
        p1Slot = winnerSlot(resolved[l - 2][m * 2])
        p2Slot = winnerSlot(resolved[l - 2][m * 2 + 1])
      }

      round.push(
        resolveMatch(
          { id: structure.losers[l - 1][m].id },
          p1Slot,
          p2Slot,
          results,
          pruned
        )
      )
    }
    resolved.push(round)
  }
  return resolved
}

/**
 * Resuelve la gran final (un solo partido: campeón WB vs campeón LB).
 * @param {ReturnType<typeof buildDoubleEliminationStructure>} structure
 * @param {DeMatch[][]} wbResolved
 * @param {DeMatch[][]} lbResolved
 * @param {Record<string, { winner: string }>} results
 * @param {Record<string, { winner: string }>} pruned
 * @returns {DeMatch[]}
 */
function resolveGrandFinal(structure, wbResolved, lbResolved, results, pruned) {
  const wbFinal = wbResolved[wbResolved.length - 1]?.[0] ?? null
  const wbChampionSlot = winnerSlot(wbFinal)
  // Sin rondas de perdedores (2 participantes) el perdedor de la final de WB
  // es directamente el retador de la gran final.
  const lbChampionSlot =
    lbResolved.length > 0
      ? winnerSlot(lbResolved[lbResolved.length - 1][0])
      : loserSlot(wbFinal)

  return [
    resolveMatch(
      { id: structure.grandFinal[0].id },
      wbChampionSlot,
      lbChampionSlot,
      results,
      pruned
    ),
  ]
}

/**
 * Resuelve el torneo completo a partir de los resultados guardados.
 * `options` se acepta por compatibilidad con estados antiguos (p. ej.
 * `resetGrandFinal`) y se ignora: siempre hay una sola gran final.
 * @param {string[]} seeds
 * @param {Record<string, { winner: string }>} results
 * @param {object} [_options]
 */
export function resolveDoubleElimination(seeds, results = {}, _options = {}) {
  const structure = buildDoubleEliminationStructure(seeds)
  /** @type {Record<string, { winner: string }>} */
  const pruned = {}

  const wbResolved = resolveWinners(structure, results, pruned)
  const lbResolved = resolveLosers(structure, wbResolved, results, pruned)
  const gfResolved = resolveGrandFinal(
    structure,
    wbResolved,
    lbResolved,
    results,
    pruned
  )

  return {
    structure,
    winners: wbResolved,
    losers: lbResolved,
    grandFinal: gfResolved,
    results: pruned,
  }
}

/**
 * Ids canónicos de todos los partidos (orden estable para codificar).
 * @param {ReturnType<typeof buildDoubleEliminationStructure>} structure
 * @returns {string[]}
 */
function canonicalMatchIds(structure) {
  const ids = []
  for (const round of structure.winners) {
    for (const match of round) ids.push(match.id)
  }
  for (const round of structure.losers) {
    for (const match of round) ids.push(match.id)
  }
  for (const match of structure.grandFinal) ids.push(match.id)
  return ids
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
 * @type {FormatEngine}
 */
export const doubleElimination = {
  id: DOUBLE_ELIMINATION_ID,

  /**
   * @param {string[]} players
   * @param {object} [_options] Opciones legacy (p. ej. `resetGrandFinal`) se ignoran.
   */
  create(players, _options = {}) {
    return {
      seeds: players.filter(Boolean),
      results: {},
      options: {},
    }
  },

  /**
   * @param {object} state
   */
  cloneState(state) {
    return {
      seeds: [...(state?.seeds ?? [])],
      results: Object.fromEntries(
        Object.entries(state?.results ?? {}).map(([id, value]) => [
          id,
          { ...value },
        ])
      ),
      options: { ...(state?.options ?? {}) },
    }
  },

  /**
   * @param {object} state
   * @param {string} matchId
   * @param {{ winner?: string }} result
   */
  applyResult(state, matchId, result) {
    const winner = result?.winner
    if (typeof winner !== 'string' || !winner) {
      throw new Error('El resultado debe incluir un ganador.')
    }

    const resolved = this.resolve(state)
    const match = this.findMatch(resolved, matchId)
    if (!match) {
      throw new Error(`Partido no encontrado: ${matchId}`)
    }
    if (match.p1 == null || match.p2 == null) {
      throw new Error(`El partido ${matchId} no se puede decidir.`)
    }
    if (winner !== match.p1 && winner !== match.p2) {
      throw new Error(`"${winner}" no participa en ${matchId}`)
    }

    const results = { ...state.results, [matchId]: { winner } }
    const next = this.resolve({ ...state, results })
    return { ...state, results: next.results }
  },

  /**
   * @param {object} state
   * @param {string} matchId
   * @param {string|null} player
   */
  canPick(state, matchId, player) {
    const resolved = this.resolve(state)
    const match = this.findMatch(resolved, matchId)
    if (!match || !player) return false
    if (match.p1 == null || match.p2 == null) return false
    return match.winner !== player
  },

  /**
   * @param {object} state
   * @returns {string|null}
   */
  getChampion(state) {
    const resolved = this.resolve(state)
    const matches = resolved.grandFinal
    if (!matches.length) return null
    return matches[matches.length - 1].winner ?? null
  },

  /**
   * @param {object} state
   * @returns {string[]}
   */
  getRoster(state) {
    return Array.isArray(state?.seeds) ? [...state.seeds] : []
  },

  /**
   * @param {object} state
   */
  getProgress(state) {
    const resolved = this.resolve(state)
    let played = 0
    let total = 0
    const count = (match) => {
      if (!match.contested) return
      total += 1
      if (match.status === 'decided') played += 1
    }
    for (const round of resolved.winners) round.forEach(count)
    for (const round of resolved.losers) round.forEach(count)
    resolved.grandFinal.forEach(count)

    return { played, total, complete: total > 0 && played === total }
  },

  /**
   * @param {object} state
   */
  reorder(state) {
    return {
      ...this.cloneState(state),
      seeds: shuffleSeeds(state.seeds),
      results: {},
    }
  },

  /**
   * @param {unknown} value
   */
  validateState(value) {
    if (!value || typeof value !== 'object') return false
    const data = /** @type {Record<string, unknown>} */ (value)
    if (!Array.isArray(data.seeds)) return false
    if (!data.seeds.every((seed) => typeof seed === 'string')) return false
    if (!data.results || typeof data.results !== 'object') return false
    return Object.values(data.results).every(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof (/** @type {Record<string, unknown>} */ (entry).winner) === 'string'
    )
  },

  /**
   * @param {object} state
   * @param {EngineContext} ctx
   */
  encode(state, ctx) {
    const players = ctx?.players
    if (!Array.isArray(players) || players.length === 0) return null

    const seedIndexes = state.seeds.map((seed) => playerIndex(players, seed))
    if (seedIndexes.some((index) => index < 0)) return null

    const resolved = this.resolve(state)
    const ids = canonicalMatchIds(resolved.structure)
    /** @type {number[][]} */
    const pairs = []
    for (const id of ids) {
      const stored = resolved.results[id]
      if (!stored) continue
      const winnerIndex = playerIndex(players, stored.winner)
      if (winnerIndex < 0) continue
      pairs.push([ids.indexOf(id), winnerIndex])
    }

    const isIdentityOrder = seedIndexes.every((index, i) => index === i)
    return {
      ...(isIdentityOrder ? {} : { s: seedIndexes }),
      r: pairs,
    }
  },

  /**
   * @param {unknown} payload
   * @param {EngineContext} ctx
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

    const structure = buildDoubleEliminationStructure(seeds)
    const ids = canonicalMatchIds(structure)

    /** @type {Record<string, { winner: string }>} */
    const results = {}
    const pairs = Array.isArray(raw.r) ? raw.r : []
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 2) continue
      const [matchIndex, winnerIndex] = pair.map((value) => Number(value))
      if (!Number.isInteger(matchIndex) || matchIndex < 0 || matchIndex >= ids.length) {
        continue
      }
      if (!Number.isInteger(winnerIndex) || winnerIndex < 0 || winnerIndex >= players.length) {
        continue
      }
      results[ids[matchIndex]] = { winner: players[winnerIndex] }
    }

    const resolved = resolveDoubleElimination(seeds, results)
    return {
      seeds,
      results: resolved.results,
      options: {},
    }
  },

  /**
   * @param {string[]} players
   */
  validateSetup(players) {
    if (!Array.isArray(players) || players.length < 2) {
      return { ok: false, error: 'Añade al menos 2 participantes.' }
    }
    if (players.length < 4) {
      return {
        ok: true,
        error: null,
        warning:
          'Con menos de 4 participantes la eliminación doble se reduce a una final a doble partida.',
      }
    }
    return { ok: true, error: null }
  },

  /**
   * Resuelve el torneo a partir del estado persistido.
   * @param {object} state
   */
  resolve(state) {
    return resolveDoubleElimination(
      state?.seeds ?? [],
      state?.results ?? {},
      state?.options ?? {}
    )
  },

  /**
   * @param {ReturnType<typeof resolveDoubleElimination>} resolved
   * @param {string} matchId
   * @returns {DeMatch|null}
   */
  findMatch(resolved, matchId) {
    const search = (rounds) => {
      for (const round of rounds) {
        for (const match of round) {
          if (match.id === matchId) return match
        }
      }
      return null
    }
    return (
      search(resolved.winners) ??
      search(resolved.losers) ??
      resolved.grandFinal.find((match) => match.id === matchId) ??
      null
    )
  },

  /**
   * Vista para la UI: brackets resueltos + etiquetas.
   * @param {object} state
   */
  getBrackets(state) {
    const resolved = this.resolve(state)
    const wbLabels = resolved.winners.map((round, index) =>
      roundLabel(index, resolved.winners.length, round.length)
    )
    const lbLabels = resolved.losers.map((round, index) =>
      `Perdedores ${index + 1}`
    )
    const gfLabels = resolved.grandFinal.map(() => 'Gran final')

    return {
      size: resolved.structure.size,
      k: resolved.structure.k,
      winners: { rounds: resolved.winners, labels: wbLabels },
      losers: { rounds: resolved.losers, labels: lbLabels },
      grandFinal: { matches: resolved.grandFinal, labels: gfLabels },
    }
  },
}
