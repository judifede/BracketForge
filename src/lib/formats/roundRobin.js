import {
  accumulateResult,
  createStandings,
  sortStandings,
} from './standings.js'

/**
 * @typedef {import('./types.js').FormatEngine} FormatEngine
 * @typedef {import('./types.js').EngineContext} EngineContext
 */

/**
 * @typedef {Object} RrMatch
 * @property {string} id
 * @property {string} p1
 * @property {string} p2
 * @property {number|null} score1
 * @property {number|null} score2
 * @property {boolean} played
 */

export const ROUND_ROBIN_ID = 'r'

/**
 * Calendario por método del círculo.
 *
 * Con n impar se añade un hueco (`null`) para que las rondas tengan siempre
 * el mismo número de elementos; ese hueco es el descanso de la jornada.
 *
 * @param {string[]} players
 * @returns {Array<Array<{ id: string, p1: string, p2: string }>>}
 */
export function buildRoundRobinSchedule(players) {
  const roster = players.filter(Boolean)
  if (roster.length < 2) return []

  const even = roster.length % 2 === 0 ? roster.length : roster.length + 1
  /** @type {Array<string|null>} */
  let slots = [...roster]
  if (roster.length % 2 !== 0) slots.push(null)

  /** @type {Array<Array<{ id: string, p1: string, p2: string }>>} */
  const rounds = []

  for (let r = 0; r < even - 1; r += 1) {
    const round = []
    for (let i = 0; i < even / 2; i += 1) {
      const p1 = slots[i]
      const p2 = slots[even - 1 - i]
      if (p1 == null || p2 == null) continue
      round.push({ id: `rr-r${r}-m${round.length}`, p1, p2 })
    }
    rounds.push(round)

    // Rotación: el primero se queda fijo y el último pasa a la segunda posición.
    slots = [slots[0], slots[even - 1], ...slots.slice(1, even - 1)]
  }

  return rounds
}

/**
 * Calendario con la opción de doble vuelta (cada pareja juega dos veces).
 * @param {string[]} players
 * @param {{ doubleRound?: boolean }} [options]
 * @returns {Array<Array<{ id: string, p1: string, p2: string }>>}
 */
export function buildSchedule(players, options = {}) {
  const first = buildRoundRobinSchedule(players)
  if (!options?.doubleRound) return first

  const second = buildRoundRobinSchedule(players).map((round) =>
    round.map((match) => ({ ...match }))
  )
  const offset = first.length

  return [
    ...first,
    ...second.map((round, index) =>
      round.map((match, m) => ({
        id: `rr-r${offset + index}-m${m}`,
        p1: match.p2,
        p2: match.p1,
      }))
    ),
  ]
}

/**
 * @param {string[]} players
 * @param {object} [options]
 * @returns {{ doubleRound: boolean, pointsWin: number, pointsDraw: number }}
 */
function normalizeOptions(options = {}) {
  return {
    doubleRound: Boolean(options?.doubleRound),
    pointsWin:
      Number.isFinite(options?.pointsWin) && options.pointsWin >= 0
        ? options.pointsWin
        : 3,
    pointsDraw:
      Number.isFinite(options?.pointsDraw) && options.pointsDraw >= 0
        ? options.pointsDraw
        : 1,
  }
}

/**
 * @type {FormatEngine}
 */
export const roundRobin = {
  id: ROUND_ROBIN_ID,

  /**
   * @param {string[]} players
   * @param {object} [options]
   */
  create(players, options = {}) {
    return {
      seeds: players.filter(Boolean),
      results: {},
      options: normalizeOptions(options),
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
      options: { ...normalizeOptions(state?.options) },
    }
  },

  /**
   * Aplica un marcador a un partido.
   * @param {object} state
   * @param {string} matchId
   * @param {{ a?: number, b?: number, score1?: number, score2?: number }} result
   */
  applyResult(state, matchId, result) {
    const a = result?.a ?? result?.score1
    const b = result?.b ?? result?.score2
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      throw new Error('El resultado debe incluir dos marcadores enteros.')
    }
    if (a < 0 || b < 0) {
      throw new Error('Los marcadores no pueden ser negativos.')
    }

    const match = this.findMatch(state, matchId)
    if (!match) {
      throw new Error(`Partido no encontrado: ${matchId}`)
    }

    return {
      ...state,
      results: { ...state.results, [matchId]: { a, b } },
    }
  },

  /**
   * En round robin se introducen marcadores, no se elige ganador.
   * @param {object} state
   */
  canPick() {
    return false
  },

  /**
   * El campeón sólo existe cuando la liga está completa: mientras haya
   * partidos sin jugar sólo hay "líder de la tabla", no campeón.
   * @param {object} state
   * @returns {string|null}
   */
  getChampion(state) {
    const progress = this.getProgress(state)
    if (!progress.complete) return null
    const standings = this.getStandings(state)
    return standings[0]?.name ?? null
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
    const schedule = this.getSchedule(state)
    const total = schedule.flat().length
    const played = schedule
      .flat()
      .filter((match) => match.played).length
    return { played, total, complete: total > 0 && played === total }
  },

  /**
   * Reinicia los resultados y conserva seeds (y por tanto el calendario).
   * @param {object} state
   */
  reorder(state) {
    return {
      ...this.cloneState(state),
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
        Number.isInteger(/** @type {any} */ (entry).a) &&
        Number.isInteger(/** @type {any} */ (entry).b)
    )
  },

  /**
   * @param {object} state
   * @param {EngineContext} ctx
   */
  encode(state, ctx) {
    const players = ctx?.players
    if (!Array.isArray(players) || players.length === 0) return null

    const seedIndexes = state.seeds.map((seed) =>
      players.findIndex(
        (player) => player.toLowerCase() === String(seed).toLowerCase()
      )
    )
    if (seedIndexes.some((index) => index < 0)) return null

    const schedule = this.getSchedule(state)
    /** @type {number[][]} */
    const pairs = []
    schedule.flat().forEach((match, index) => {
      if (!match.played) return
      const result = state.results[match.id]
      if (!result) return
      pairs.push([index, result.a, result.b])
    })

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

    const options = normalizeOptions(ctx?.options)
    const schedule = buildSchedule(seeds, options).flat()

    /** @type {Record<string, { a: number, b: number }>} */
    const results = {}
    const pairs = Array.isArray(raw.r) ? raw.r : []
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 3) continue
      const [index, a, b] = pair.map((value) => Number(value))
      if (!Number.isInteger(index) || index < 0 || index >= schedule.length) {
        continue
      }
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue
      if (a < 0 || b < 0) continue
      results[schedule[index].id] = { a, b }
    }

    return { seeds, results, options }
  },

  /**
   * @param {string[]} players
   */
  validateSetup(players) {
    if (!Array.isArray(players) || players.length < 2) {
      return { ok: false, error: 'Añade al menos 2 participantes.' }
    }
    return { ok: true, error: null }
  },

  /**
   * Calendario con los marcadores ya aplicados.
   * @param {object} state
   * @returns {Array<Array<RrMatch>>}
   */
  getSchedule(state) {
    const options = normalizeOptions(state?.options)
    const rounds = buildSchedule(state?.seeds ?? [], options)
    const results = state?.results ?? {}

    return rounds.map((round, index) =>
      round.map((match) => {
        const result = results[match.id]
        return {
          id: match.id,
          p1: match.p1,
          p2: match.p2,
          score1: result?.a ?? null,
          score2: result?.b ?? null,
          played: Boolean(result),
          roundIndex: index,
        }
      })
    )
  },

  /**
   * Tabla de clasificación.
   * @param {object} state
   */
  getStandings(state) {
    const options = normalizeOptions(state?.options)
    const schedule = buildSchedule(state?.seeds ?? [], options).flat()
    const results = state?.results ?? {}
    const rows = createStandings(state?.seeds ?? [])

    for (const match of schedule) {
      const result = results[match.id]
      if (!result) continue
      accumulateResult(rows, match.p1, match.p2, result.a, result.b, options)
    }

    for (const row of rows.values()) {
      row.diff = row.goalsFor - row.goalsAgainst
    }

    return sortStandings(rows, {
      matches: schedule,
      results,
      options,
      tiebreaker: 'head-to-head',
    })
  },

  /**
   * @param {object} state
   * @param {string} matchId
   */
  findMatch(state, matchId) {
    const schedule = buildSchedule(
      state?.seeds ?? [],
      normalizeOptions(state?.options)
    ).flat()
    return schedule.find((match) => match.id === matchId) ?? null
  },
}
