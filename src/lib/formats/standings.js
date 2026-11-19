/**
 * Cálculo de clasificación compartido por Round Robin y Suizo.
 *
 * Todos los motores son funciones puras: reciben partidos + resultados y
 * devuelven la tabla de clasificación ordenada con sus desempates aplicados.
 */

/**
 * @typedef {Object} StandingRow
 * @property {string} name
 * @property {number} played
 * @property {number} won
 * @property {number} drawn
 * @property {number} lost
 * @property {number} goalsFor
 * @property {number} goalsAgainst
 * @property {number} diff
 * @property {number} points
 * @property {number} buchholz Suma de los puntos de los rivales (desempate del suizo).
 * @property {number} sonneborn Suma de los puntos de los rivales vencidos (Sonneborn-Berger).
 * @property {number} position
 */

/**
 * @param {string[]} players
 * @returns {Map<string, StandingRow>}
 */
export function createStandings(players) {
  const rows = new Map()
  for (const name of players) {
    rows.set(name, {
      name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      diff: 0,
      points: 0,
      buchholz: 0,
      sonneborn: 0,
      position: 0,
    })
  }
  return rows
}

/**
 * Acumula el resultado de un partido en la tabla.
 * @param {Map<string, StandingRow>} rows
 * @param {string} p1
 * @param {string} p2
 * @param {number} a Goles de p1
 * @param {number} b Goles de p2
 * @param {{ pointsWin: number, pointsDraw: number }} options
 */
export function accumulateResult(rows, p1, p2, a, b, options) {
  const home = rows.get(p1)
  const away = rows.get(p2)
  if (!home || !away) return

  const pointsWin = options?.pointsWin ?? 3
  const pointsDraw = options?.pointsDraw ?? 1

  home.played += 1
  away.played += 1
  home.goalsFor += a
  home.goalsAgainst += b
  away.goalsFor += b
  away.goalsAgainst += a

  if (a > b) {
    home.won += 1
    away.lost += 1
    home.points += pointsWin
  } else if (a < b) {
    away.won += 1
    home.lost += 1
    away.points += pointsWin
  } else {
    home.drawn += 1
    away.drawn += 1
    home.points += pointsDraw
    away.points += pointsDraw
  }
}

/**
 * Puntos que cada jugador del grupo se lleva en los partidos directos.
 * @param {string[]} group
 * @param {Array<{ id: string, p1: string, p2: string }>} matches
 * @param {Record<string, { a: number, b: number }>} results
 * @param {{ pointsWin: number, pointsDraw: number }} options
 * @returns {Map<string, number>}
 */
export function headToHeadPoints(group, matches, results, options) {
  const points = new Map(group.map((name) => [name, 0]))
  const pointsWin = options?.pointsWin ?? 3
  const pointsDraw = options?.pointsDraw ?? 1

  for (const match of matches) {
    if (!group.includes(match.p1) || !group.includes(match.p2)) continue
    const result = results[match.id]
    if (!result) continue
    if (result.a > result.b) {
      points.set(match.p1, (points.get(match.p1) ?? 0) + pointsWin)
    } else if (result.a < result.b) {
      points.set(match.p2, (points.get(match.p2) ?? 0) + pointsWin)
    } else {
      points.set(match.p1, (points.get(match.p1) ?? 0) + pointsDraw)
      points.set(match.p2, (points.get(match.p2) ?? 0) + pointsDraw)
    }
  }
  return points
}

/**
 * Calcula el Buchholz de cada jugador: la suma de los puntos de sus rivales.
 * @param {Map<string, StandingRow>} rows
 * @param {Array<{ p1: string, p2: string }>} matches
 * @returns {Map<string, number>}
 */
export function computeBuchholz(rows, matches) {
  const buchholz = new Map()
  for (const name of rows.keys()) buchholz.set(name, 0)

  for (const match of matches) {
    const home = rows.get(match.p1)
    const away = rows.get(match.p2)
    if (!home || !away) continue
    buchholz.set(
      match.p1,
      (buchholz.get(match.p1) ?? 0) + away.points
    )
    buchholz.set(
      match.p2,
      (buchholz.get(match.p2) ?? 0) + home.points
    )
  }
  return buchholz
}

/**
 * Calcula el Sonneborn-Berger: la suma de los puntos de los rivales a los que
 * se ha vencido (los empates no suman).
 *
 * @param {Map<string, StandingRow>} rows
 * @param {Array<{ id: string, p1: string, p2: string }>} matches
 * @param {Record<string, { a: number, b: number }>} results
 * @returns {Map<string, number>}
 */
export function computeSonnebornBerger(rows, matches, results = {}) {
  const sb = new Map()
  for (const name of rows.keys()) sb.set(name, 0)

  for (const match of matches) {
    const result = results[match.id]
    if (!result) continue
    const home = rows.get(match.p1)
    const away = rows.get(match.p2)
    if (!home || !away) continue
    if (result.a > result.b) {
      sb.set(match.p1, (sb.get(match.p1) ?? 0) + away.points)
    } else if (result.b > result.a) {
      sb.set(match.p2, (sb.get(match.p2) ?? 0) + home.points)
    }
  }
  return sb
}

/**
 * Ordena la tabla aplicando los desempates.
 *
 * Orden por defecto: puntos → diferencia → goles a favor → head-to-head →
 * orden alfabético (siempre determinista). El parámetro `criteria` permite
 * cambiar el orden (el suits usa `buchholz`).
 *
 * @param {Map<string, StandingRow>} rows
 * @param {{
 *   matches: Array<{ id: string, p1: string, p2: string }>,
 *   results: Record<string, { a: number, b: number }>,
 *   options: { pointsWin: number, pointsDraw: number },
 *   criteria?: string[],
 *   tiebreaker?: 'head-to-head'|null,
 * }} context
 * @returns {StandingRow[]}
 */
export function sortStandings(rows, context) {
  const {
    matches = [],
    results = {},
    options = {},
    criteria = ['points', 'diff', 'goalsFor'],
    tiebreaker = 'head-to-head',
  } = context

  const list = [...rows.values()]

  if (criteria.includes('buchholz')) {
    const buchholz = computeBuchholz(rows, matches)
    for (const row of list) row.buchholz = buchholz.get(row.name) ?? 0
  }
  if (criteria.includes('sonneborn')) {
    const sb = computeSonnebornBerger(rows, matches, results)
    for (const row of list) row.sonneborn = sb.get(row.name) ?? 0
  }

  const byName = (a, b) => a.name.localeCompare(b.name, 'es')

  const compareBy = (a, b, key) => {
    const va = Number(a[key] ?? 0)
    const vb = Number(b[key] ?? 0)
    if (vb !== va) return vb - va
    return 0
  }

  const baseCompare = (a, b) => {
    for (const key of criteria) {
      const diff = compareBy(a, b, key)
      if (diff !== 0) return diff
    }
    return 0
  }

  list.sort(baseCompare)

  // Grupos empatados en todos los criterios: se resuelven con head-to-head
  // (si está activo) o de forma alfabética.
  const groups = []
  let current = list.length ? [list[0]] : []
  for (let i = 1; i < list.length; i += 1) {
    const previous = list[i - 1]
    const row = list[i]
    const same = criteria.every(
      (key) => Number(previous[key] ?? 0) === Number(row[key] ?? 0)
    )
    if (same) current.push(row)
    else {
      groups.push(current)
      current = [row]
    }
  }
  if (current.length) groups.push(current)

  const ordered = []
  for (const group of groups) {
    if (group.length === 1) {
      ordered.push(group[0])
      continue
    }

    if (tiebreaker === 'head-to-head') {
      const h2h = headToHeadPoints(
        group.map((row) => row.name),
        matches,
        results,
        options
      )
      group.sort((a, b) => {
        const pa = h2h.get(a.name) ?? 0
        const pb = h2h.get(b.name) ?? 0
        if (pb !== pa) return pb - pa
        return byName(a, b)
      })
    } else {
      group.sort(byName)
    }
    ordered.push(...group)
  }

  ordered.forEach((row, index) => {
    row.position = index + 1
  })
  return ordered
}
