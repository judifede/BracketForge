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
 * @typedef {Object} SwissMatch
 * @property {string} id
 * @property {string|null} p1
 * @property {string|null} p2
 * @property {number|null} score1
 * @property {number|null} score2
 * @property {boolean} played
 * @property {boolean} bye
 */

export const SWISS_ID = 's'

/**
 * Rondas por defecto cuando el usuario no eligió un valor en el setup:
 * `min(3, floor(log2(n)))`, con mínimo 1.
 *
 * @param {number} playerCount
 * @returns {number}
 */
export function defaultSwissTotalRounds(playerCount) {
  const n = Math.max(2, Number(playerCount) || 2)
  return Math.max(1, Math.min(3, Math.floor(Math.log2(n))))
}

/**
 * @param {object} [options]
 * @param {number} [playerCount] Usado sólo si `totalRounds` no viene definido.
 * @returns {{ totalRounds: number, pointsWin: number, pointsDraw: number }}
 */
function normalizeOptions(options = {}, playerCount) {
  const total = Number(options?.totalRounds)
  const hasChosenRounds = Number.isInteger(total) && total > 0
  return {
    // Si el setup no mandó totalRounds, el default depende del tamaño del campo.
    totalRounds: hasChosenRounds
      ? total
      : defaultSwissTotalRounds(playerCount ?? 8),
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
 * Clave de dos Rivales, insensible a mayúsculas.
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
function pairKey(a, b) {
  return [a, b].map((name) => name.toLowerCase()).sort().join('|')
}

/**
 * Emparejamiento máximo entre dos mitades de un grupo, evitando revanchas.
 *
 * El grafo "se puede enfrentar" es bipartito (mitad alta contra mitad baja),
 * así que se resuelve con el algoritmo de Kuhn (emparejamiento bipartito
 * máximo).
 *
 * @param {string[]} top Mitad mejor clasificada.
 * @param {string[]} bottom Mitad peor clasificada.
 * @param {Set<string>} played Rivales ya enfrentados (clave normalizada).
 * @returns {{ pairs: Array<[string, string]>, freeTop: string[], freeBottom: string[] }}
 */
function matchHalves(top, bottom, played) {
  /** @type {Map<string, string>} */
  const matchBottom = new Map()

  const tryKuhn = (a, visited) => {
    for (const b of bottom) {
      if (played.has(pairKey(a, b))) continue
      if (visited.has(b)) continue
      visited.add(b)
      const current = matchBottom.get(b)
      if (!current || tryKuhn(current, visited)) {
        matchBottom.set(b, a)
        return true
      }
    }
    return false
  }

  for (const a of top) tryKuhn(a, new Set())

  /** @type {Array<[string, string]>} */
  const pairs = []
  const usedTop = new Set()
  for (const [b, a] of matchBottom) {
    pairs.push([a, b])
    usedTop.add(a)
  }
  // Orden estable por posición en la clasificación.
  pairs.sort(
    (x, y) => top.indexOf(x[0]) - top.indexOf(y[0])
  )

  return {
    pairs,
    freeTop: top.filter((a) => !usedTop.has(a)),
    freeBottom: bottom.filter((b) => !matchBottom.has(b)),
  }
}

/**
 * Emparejamientos posibles de un grupo sin revanchas.
 *
 * Para grupos pequeños se enumeran todos (el orden importa: la búsqueda
 * prueba el primero que funciona). Para grupos grandes se usa el
 * emparejamiento bipartito máximo, que es instantáneo.
 *
 * @param {string[]} members
 * @param {Set<string>} played
 * @returns {Array<Array<[string, string]>>}
 */
function groupMatchings(members, played) {
  if (members.length < 2) return []
  if (members.length % 2 === 1) return []

  if (members.length > 10) {
    const half = members.length / 2
    const { pairs, freeTop, freeBottom } = matchHalves(
      members.slice(0, half),
      members.slice(half),
      played
    )
    if (freeTop.length || freeBottom.length) return []
    return [pairs]
  }

  /** @type {Array<Array<[string, string]>>} */
  const results = []
  const used = new Array(members.length).fill(false)
  /** @type {Array<[string, string]>} */
  const current = []

  const recurse = (index) => {
    if (results.length >= 200) return
    if (index >= members.length) {
      results.push([...current])
      return
    }
    if (used[index]) {
      recurse(index + 1)
      return
    }
    used[index] = true
    for (let j = index + 1; j < members.length; j += 1) {
      if (used[j]) continue
      if (played.has(pairKey(members[index], members[j]))) continue
      used[j] = true
      current.push([members[index], members[j]])
      recurse(index + 1)
      current.pop()
      used[j] = false
    }
    used[index] = false
  }

  recurse(0)
  return results
}

/**
 * Resuelve la ronda completa con búsqueda y backtracking.
 *
 * Objetivo: emparejar a todos sin revanchas, manteniendo la estructura de
 * grupos por puntuación (el que sobra en un grupo impar "flota" al siguiente).
 * Si no hay solución sin revanchas, se devuelve `null` y el emparejamiento
 * greedy hace de 대체 (quedan avisos de revancha en la ronda).
 *
 * @param {string[][]} groups Grupos por puntuación, de mayor a menor.
 * @param {Set<string>} played
 * @param {number} [maxNodes]
 * @returns {Array<[string, string]>|null}
 */
function solveRound(groups, played, maxNodes = 20000) {
  let nodes = 0

  const recurse = (index, floaters, acc) => {
    nodes += 1
    if (nodes > maxNodes) return null

    if (index >= groups.length) {
      if (!floaters.length) return [...acc]
      const matchings = groupMatchings(floaters, played)
      if (!matchings.length) return null
      return [...acc, ...matchings[0]]
    }

    const pool = [...floaters, ...groups[index]]

    if (pool.length % 2 === 0) {
      for (const matching of groupMatchings(pool, played)) {
        const result = recurse(index + 1, [], [...acc, ...matching])
        if (result) return result
      }
      return null
    }

    // Número impar: uno de ellos flota al grupo siguiente (se prueban todos,
    // del peor al mejor).
    for (const candidate of [...pool].reverse()) {
      const rest = pool.filter((name) => name !== candidate)
      for (const matching of groupMatchings(rest, played)) {
        const result = recurse(index + 1, [candidate], [...acc, ...matching])
        if (result) return result
      }
    }
    return null
  }

  return recurse(0, [], [])
}

/**
 * Reparación local de revanchas: se intercambian los rivales de dos partidos
 * mientras no se empeore la estructura de la ronda (los participantes siguen
 * enfrentándose a rivales de la misma puntuación o de la adyacente).
 *
 * @param {Array<[string, string]>} pairs Emparejamientos de la ronda.
 * @param {Set<string>} played Rivales ya enfrentados.
 * @param {Map<string, number>} points Puntuación de cada participante.
 * @returns {Array<[string, string]>}
 */
function repairRematches(pairs, played, points) {
  const current = pairs.map((pair) => [...pair])
  const rematches = (pair) => (played.has(pairKey(pair[0], pair[1])) ? 1 : 0)
  const spread = (pair) =>
    Math.abs((points.get(pair[0]) ?? 0) - (points.get(pair[1]) ?? 0))

  let improved = true
  let guard = 0
  while (improved && guard < 40) {
    improved = false
    guard += 1
    for (let i = 0; i < current.length; i += 1) {
      for (let j = i + 1; j < current.length; j += 1) {
        const before = rematches(current[i]) + rematches(current[j])
        if (!before) continue
        const [a, b] = current[i]
        const [c, d] = current[j]
        const candidates = [
          [[a, c], [b, d]],
          [[a, d], [b, c]],
        ]
        for (const candidate of candidates) {
          const after =
            rematches(candidate[0]) + rematches(candidate[1])
          if (after >= before) continue
          // No se empeora la separación de puntuaciones.
          const maxBefore = Math.max(spread(current[i]), spread(current[j]))
          const maxAfter = Math.max(spread(candidate[0]), spread(candidate[1]))
          if (maxAfter > maxBefore) continue
          current[i] = candidate[0]
          current[j] = candidate[1]
          improved = true
          break
        }
      }
    }
  }
  return current
}

/**
 * Emparejamiento de una ronda suiza.
 *
 * 1. Si el número de participantes es impar, uno recibe descanso: el mejor
 *    clasificado que aún no lo haya tenido (el estado guarda `byes`).
 * 2. El resto se agrupa por puntuación (el mejor de cada grupo primero).
 * 3. Dentro del grupo se empareja por pliegue, reparando revanchas.
 * 4. Si el grupo tiene un número impar de miembros, el peor "flota" al grupo
 *    inferior; el flotante se empareja con el mejor del grupo.
 *
 * @param {Array<{ name: string, points: number }>} ranked Clasificación ordenada.
 * @param {string[][]} history Rivales ya enfrentados.
 * @param {string[]} [previousByes] Participantes que ya tuvieron descanso.
 * @returns {Array<[string, string|null]>}
 */
export function pairSwissRound(ranked, history, previousByes = []) {
  const played = new Set(history.map(([a, b]) => pairKey(a, b)))
  const byes = new Set(previousByes)

  // 1. Descanso: el mejor clasificado que todavía no lo haya tenido.
  let byePlayer = null
  if (ranked.length % 2 === 1) {
    const eligible = ranked.find((row) => !byes.has(row.name))
    byePlayer = (eligible ?? ranked[0])?.name ?? null
  }

  /** @type {Map<number, string[]>} */
  const groups = new Map()
  for (const row of ranked) {
    if (row.name === byePlayer) continue
    const list = groups.get(row.points) ?? []
    list.push(row.name)
    groups.set(row.points, list)
  }

  // 3. Se busca una ronda completa sin revanchas (búsqueda con backtracking).
  //    Si no hay solución, se usa el emparejamiento greedy como alternativa.
  const orderedGroups = [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, members]) => members)

  const points = new Map(ranked.map((row) => [row.name, row.points]))
  const solved = solveRound(orderedGroups, played)

  /** @type {Array<[string, string|null]>} */
  let pairs = []
  if (solved) {
    pairs = solved.map((pair) => [...pair])
  } else {
    // Alternativa greedy: emparejamiento por grupos con "downfloat".
    /** @type {string[]} */
    let floaters = []
    const rankOf = new Map(ranked.map((row, index) => [row.name, index]))

    for (const members of orderedGroups) {
      // Los flotantes entran por abajo del grupo: tienen más puntos que sus
      // miembros y se emparejan con los más débiles de este.
      const pool = [
        ...floaters.sort((a, b) => (rankOf.get(b) ?? 0) - (rankOf.get(a) ?? 0)),
        ...members,
      ]
      floaters = []
      const half = Math.floor(pool.length / 2)
      const matched = matchHalves(
        pool.slice(0, half),
        pool.slice(half),
        played
      )
      for (const [a, b] of matched.pairs) pairs.push([a, b])
      floaters = [...matched.freeTop, ...matched.freeBottom]
    }

    if (floaters.length) {
      const half = Math.floor(floaters.length / 2)
      const matched = matchHalves(
        floaters.slice(0, half),
        floaters.slice(half),
        played
      )
      for (const [a, b] of matched.pairs) pairs.push([a, b])
      const left = [...matched.freeTop, ...matched.freeBottom]
      for (let i = 0; i + 1 < left.length; i += 2) {
        pairs.push([left[i], left[i + 1]])
      }
      if (left.length % 2 === 1) pairs.push([left[left.length - 1], null])
    }
  }

  if (byePlayer) pairs.push([byePlayer, null])

  // Reparación final: si ha quedado alguna revancha, se intenta eliminar
  // intercambiando rivales entre partidos.
  const real = pairs.filter((pair) => pair[1] != null)
  const rest = pairs.filter((pair) => pair[1] == null)
  const repaired = repairRematches(real, played, points)

  return [...repaired, ...rest]
}

/**
 * @type {FormatEngine}
 */
export const swiss = {
  id: SWISS_ID,

  /**
   * @param {string[]} players
   * @param {object} [options]
   */
  create(players, options = {}) {
    const seeds = players.filter(Boolean)
    return {
      seeds,
      rounds: [],
      results: {},
      history: [],
      byes: [],
      options: normalizeOptions(options, seeds.length),
    }
  },

  /**
   * @param {object} state
   */
  cloneState(state) {
    return {
      seeds: [...(state?.seeds ?? [])],
      rounds: (state?.rounds ?? []).map((round) => ({
        index: round.index,
        matches: round.matches.map((match) => ({ ...match })),
      })),
      results: Object.fromEntries(
        Object.entries(state?.results ?? {}).map(([id, value]) => [
          id,
          { ...value },
        ])
      ),
      history: (state?.history ?? []).map((pair) => [...pair]),
      byes: [...(state?.byes ?? [])],
      options: {
        ...normalizeOptions(state?.options, state?.seeds?.length),
      },
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
    if (match.p2 == null) {
      throw new Error(`El partido ${matchId} es un descanso y no admite resultado.`)
    }

    return {
      ...state,
      results: { ...state.results, [matchId]: { a, b } },
    }
  },

  /**
   * @param {object} state
   */
  canPick() {
    return false
  },

  /**
   * El campeón sólo existe cuando se han completado todas las rondas.
   * @param {object} state
   * @returns {string|null}
   */
  getChampion(state) {
    const progress = this.getProgress(state)
    if (!progress.complete) return null
    return this.getStandings(state)[0]?.name ?? null
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
    const rounds = state?.rounds ?? []
    const matches = rounds.flatMap((round) => round.matches)
    const playable = matches.filter((match) => match.p2 != null)
    const played = playable.filter((match) => this.getResult(state, match.id)).length
    return {
      played,
      total: playable.length,
      complete:
        rounds.length > 0 &&
        rounds.length >=
          normalizeOptions(state?.options, state?.seeds?.length)
            .totalRounds &&
        played === playable.length,
    }
  },

  /**
   * Reinicia el torneo: borra rondas, resultados, historial y byes.
   * @param {object} state
   */
  reorder(state) {
    return {
      ...this.cloneState(state),
      rounds: [],
      results: {},
      history: [],
      byes: [],
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
    if (!Array.isArray(data.rounds)) return false
    if (!data.results || typeof data.results !== 'object') return false
    if (!Array.isArray(data.history)) return false
    if (data.byes != null && !Array.isArray(data.byes)) return false
    return data.rounds.every(
      (round) =>
        round &&
        typeof round === 'object' &&
        Array.isArray(/** @type {any} */ (round).matches)
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

    // [ronda, partido, golA, golB]: el emparejamiento se reconstruye
    // reproduciendo las rondas con los mismos resultados.
    /** @type {number[][]} */
    const pairs = []
    this.getRounds(state).forEach((round, roundIndex) => {
      round.forEach((match, matchIndex) => {
        const result = state.results[match.id]
        if (!result) return
        pairs.push([roundIndex, matchIndex, result.a, result.b])
      })
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

    // Mismo default dinámico que create cuando el share no trae totalRounds.
    const options = normalizeOptions(ctx?.options, seeds.length)
    /** @type {Map<number, Array<[number, number, number]>>} */
    const byRound = new Map()
    const pairs = Array.isArray(raw.r) ? raw.r : []
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 4) continue
      const [roundIndex, matchIndex, a, b] = pair.map((value) => Number(value))
      if (!Number.isInteger(roundIndex) || roundIndex < 0) continue
      if (!Number.isInteger(matchIndex) || matchIndex < 0) continue
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue
      if (a < 0 || b < 0) continue
      const list = byRound.get(roundIndex) ?? []
      list.push([matchIndex, a, b])
      byRound.set(roundIndex, list)
    }

    if (!byRound.size) {
      return { seeds, rounds: [], results: {}, history: [], byes: [], options }
    }

    const maxRound = Math.max(...byRound.keys())

    // Reproduce las rondas: el emparejamiento depende del historial, que a su
    // vez depende de los resultados ya conocidos.
    /** @type {any} */
    let state = {
      seeds,
      rounds: [],
      results: {},
      history: [],
      byes: [],
      options,
    }

    for (let r = 0; r <= maxRound; r += 1) {
      const entries = byRound.get(r)
      if (!entries || !entries.length) return null

      const generated = this.generateRound(state)
      state = {
        ...state,
        rounds: generated.rounds,
        history: generated.history,
        byes: generated.byes,
      }

      for (const [matchIndex, a, b] of entries) {
        const match = state.rounds[r]?.matches[matchIndex]
        if (!match || match.p2 == null) return null
        state.results = { ...state.results, [match.id]: { a, b } }
      }
    }

    return state
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
          'Con menos de 4 participantes el emparejamiento suizo apenas tiene recorrido.',
      }
    }
    return { ok: true, error: null }
  },

  /**
   * Acciones que no son resultados: generar o deshacer una ronda.
   * @param {object} state
   * @param {{ type: string }} action
   */
  applyAction(state, action) {
    if (action?.type === 'generate-round') return this.generateRound(state)
    if (action?.type === 'undo-round') return this.undoRound(state)
    throw new Error(`Acción desconocida: ${action?.type}`)
  },

  /**
   * Genera la ronda siguiente.
   * @param {object} state
   */
  generateRound(state) {
    const options = normalizeOptions(state?.options, state?.seeds?.length)
    const rounds = state?.rounds ?? []

    if (rounds.length >= options.totalRounds) {
      throw new Error(`Ya se han generado las ${options.totalRounds} rondas.`)
    }

    // La ronda actual debe estar completa para generar la siguiente.
    const current = rounds[rounds.length - 1]
    if (current) {
      const pending = current.matches.filter(
        (match) => match.p2 != null && !this.getResult(state, match.id)
      )
      if (pending.length) {
        throw new Error('Completa la ronda actual antes de generar la siguiente.')
      }
    }

    const standings = this.getStandings(state)
    const ranked = standings.map((row) => ({
      name: row.name,
      points: row.points,
    }))
    const previousByes = state?.byes ?? []
    const pairs = pairSwissRound(ranked, state?.history ?? [], previousByes)
    const index = rounds.length

    const matches = pairs.map(([p1, p2], m) => ({
      id: `sw-r${index}-m${m}`,
      p1,
      p2,
    }))

    const history = [...(state?.history ?? [])]
    const byes = [...previousByes]
    /** @type {string[]} */
    const playedKeys = (state?.history ?? []).map(([a, b]) => pairKey(a, b))
    /** @type {Array<[string, string]>} */
    const rematches = []

    for (const [p1, p2] of pairs) {
      if (p2 == null) {
        byes.push(p1)
        continue
      }
      history.push([p1, p2])
      // Revancha inevitable: no se ha podido emparejar sin repetir.
      if (playedKeys.includes(pairKey(p1, p2))) rematches.push([p1, p2])
    }

    return {
      ...state,
      rounds: [...rounds, { index, matches, rematches }],
      history,
      byes,
    }
  },

  /**
   * Deshace la última ronda generada.
   * @param {object} state
   */
  undoRound(state) {
    const rounds = state?.rounds ?? []
    if (!rounds.length) {
      throw new Error('No hay ninguna ronda que deshacer.')
    }
    const last = rounds[rounds.length - 1]
    const results = { ...(state?.results ?? {}) }
    for (const match of last.matches) delete results[match.id]

    const history = (state?.history ?? []).filter(
      ([a, b]) =>
        !last.matches.some(
          (match) =>
            (match.p1 === a && match.p2 === b) ||
            (match.p1 === b && match.p2 === a)
        )
    )
    const byes = (state?.byes ?? []).filter(
      (name) => !last.matches.some((match) => match.p1 === name && match.p2 == null)
    )

    return { ...state, rounds: rounds.slice(0, -1), results, history, byes }
  },

  /**
   * Rondas con marcadores aplicados.
   * @param {object} state
   * @returns {Array<Array<SwissMatch>>}
   */
  getRounds(state) {
    const results = state?.results ?? {}
    return (state?.rounds ?? []).map((round) =>
      round.matches.map((match) => {
        const result = results[match.id]
        return {
          id: match.id,
          p1: match.p1,
          p2: match.p2,
          score1: result?.a ?? null,
          score2: result?.b ?? null,
          played: Boolean(result),
          bye: match.p2 == null,
          roundIndex: round.index,
        }
      })
    )
  },

  /**
   * Revanchas inevitables de la ronda (no se ha encontrado emparejamiento
   * sin repetir rivales). Se avisa en la interfaz.
   * @param {object} state
   * @param {number} [roundIndex]
   * @returns {Array<[string, string]>}
   */
  getRematches(state, roundIndex) {
    const rounds = state?.rounds ?? []
    const index =
      roundIndex == null ? rounds.length - 1 : roundIndex
    const round = rounds[index]
    if (!round) return []
    return (round.rematches ?? []).map((pair) => [...pair])
  },

  /**
   * Tabla de clasificación (con Buchholz).
   * @param {object} state
   */
  getStandings(state) {
    const options = normalizeOptions(state?.options, state?.seeds?.length)
    const matches = (state?.rounds ?? []).flatMap((round) => round.matches)
    const results = state?.results ?? {}
    const rows = createStandings(state?.seeds ?? [])

    for (const match of matches) {
      const result = results[match.id]
      if (match.p2 == null) {
        // Descanso: el jugador suma un punto.
        const row = rows.get(match.p1)
        if (row) row.points += 1
        continue
      }
      if (!result) continue
      accumulateResult(rows, match.p1, match.p2, result.a, result.b, options)
    }

    for (const row of rows.values()) {
      row.diff = row.goalsFor - row.goalsAgainst
    }

    return sortStandings(rows, {
      matches,
      results,
      options,
      criteria: ['points', 'buchholz', 'sonneborn', 'diff', 'goalsFor'],
      tiebreaker: null,
    })
  },

  /**
   * @param {object} state
   * @param {string} matchId
   */
  findMatch(state, matchId) {
    const matches = (state?.rounds ?? []).flatMap((round) => round.matches)
    return matches.find((match) => match.id === matchId) ?? null
  },

  /**
   * @param {object} state
   * @param {string} matchId
   */
  getResult(state, matchId) {
    return (state?.results ?? {})[matchId] ?? null
  },
}
