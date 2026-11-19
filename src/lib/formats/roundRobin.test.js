import { describe, it, expect } from 'vitest'
import {
  roundRobin,
  buildRoundRobinSchedule,
  buildSchedule,
} from './roundRobin.js'

const four = ['A', 'B', 'C', 'D']
const five = ['A', 'B', 'C', 'D', 'E']
const seven = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

/**
 * @param {object} state
 * @param {string} matchId
 * @param {number} a
 * @param {number} b
 */
function play(state, matchId, a, b) {
  return roundRobin.applyResult(state, matchId, { a, b })
}

describe('buildRoundRobinSchedule', () => {
  it('creates n-1 rounds for an even field', () => {
    const rounds = buildRoundRobinSchedule(four)
    expect(rounds).toHaveLength(3)
    expect(rounds.every((round) => round.length === 2)).toBe(true)
    expect(rounds.flat()).toHaveLength(6)
  })

  it('plays every pair exactly once', () => {
    const pairs = buildRoundRobinSchedule(five)
      .flat()
      .map((match) => [match.p1, match.p2].sort().join('|'))
    expect(new Set(pairs).size).toBe(10)
    expect(pairs).toHaveLength(10)
  })

  it('gives one bye per round with an odd field', () => {
    const rounds = buildRoundRobinSchedule(five)
    expect(rounds).toHaveLength(5)
    expect(rounds.every((round) => round.length === 2)).toBe(true)
    // 5 jugadores × 4 partidos = 20 apariciones (cada uno descansa una vez).
    const appearances = rounds.flat().length * 2
    expect(appearances).toBe(20)
  })

  it('builds 21 matches across 7 rounds for 7 players', () => {
    const rounds = buildRoundRobinSchedule(seven)
    expect(rounds).toHaveLength(7)
    expect(rounds.flat()).toHaveLength(21)
    // 7 jugadores → 3 partidos + 1 bye por jornada.
    expect(rounds.every((round) => round.length === 3)).toBe(true)
    for (const round of rounds) {
      const playing = new Set(round.flatMap((match) => [match.p1, match.p2]))
      expect(playing.size).toBe(6)
      const bye = seven.filter((name) => !playing.has(name))
      expect(bye).toHaveLength(1)
    }
  })

  it('gives every player the same number of matches', () => {
    const rounds = buildRoundRobinSchedule(five).flat()
    const counts = new Map()
    for (const match of rounds) {
      counts.set(match.p1, (counts.get(match.p1) ?? 0) + 1)
      counts.set(match.p2, (counts.get(match.p2) ?? 0) + 1)
    }
    for (const count of counts.values()) expect(count).toBe(4)
  })

  it('doubles the schedule when doubleRound is on', () => {
    const single = buildSchedule(five, { doubleRound: false })
    const double = buildSchedule(five, { doubleRound: true })
    expect(double).toHaveLength(single.length * 2)
    expect(double.flat()).toHaveLength(20)
    // La segunda vuelta invierte los locales y visitantes.
    const first = single.flat()[0]
    const second = double.flat().find(
      (match) => match.p1 === first.p2 && match.p2 === first.p1
    )
    expect(second).toBeTruthy()
  })
})

describe('roundRobin engine', () => {
  it('creates a tournament with no results', () => {
    const state = roundRobin.create(five)
    expect(state.seeds).toEqual(five)
    expect(roundRobin.getProgress(state)).toEqual({
      played: 0,
      total: 10,
      complete: false,
    })
    expect(roundRobin.getChampion(state)).toBeNull()
  })

  it('rejects invalid scores', () => {
    const state = roundRobin.create(four)
    const matchId = buildRoundRobinSchedule(four)[0][0].id
    expect(() => play(state, matchId, -1, 0)).toThrow(/negativos/)
    expect(() => play(state, matchId, 1.5, 0)).toThrow(/enteros/)
    expect(() => play(state, 'nope', 1, 0)).toThrow(/no encontrado/)
  })

  it('accumulates points, goals and differences', () => {
    let state = roundRobin.create(four)
    const rounds = buildRoundRobinSchedule(four)
    state = play(state, rounds[0][0].id, 3, 1)
    state = play(state, rounds[0][1].id, 2, 2)

    const standings = roundRobin.getStandings(state)
    const winner = standings.find((row) => row.name === rounds[0][0].p1)
    expect(winner).toMatchObject({
      played: 1,
      won: 1,
      drawn: 0,
      goalsFor: 3,
      goalsAgainst: 1,
      diff: 2,
      points: 3,
    })

    const draw = standings.find((row) => row.name === rounds[0][1].p1)
    expect(draw).toMatchObject({ drawn: 1, points: 1, diff: 0 })
  })

  it('sorts by points, then difference, then goals scored', () => {
    let state = roundRobin.create(four)
    const rounds = buildRoundRobinSchedule(four)
    // A gana por 1 gol, B gana por 3: mismo tipo de partido, B arriba por diferencia.
    state = play(state, rounds[0][0].id, rounds[0][0].p1 === 'A' ? 1 : 0, rounds[0][0].p1 === 'A' ? 0 : 1)
    state = play(state, rounds[0][1].id, rounds[0][1].p1 === 'B' ? 3 : 0, rounds[0][1].p1 === 'B' ? 0 : 3)

    const standings = roundRobin.getStandings(state)
    expect(standings[0].name).toBe('B')
    expect(standings[0].position).toBe(1)
  })

  it('breaks ties with head-to-head points', () => {
    // A y B empatan todo (2 partidos a 0-0 y 1-1) y C y D también.
    let state = roundRobin.create(four)
    const rounds = buildRoundRobinSchedule(four)
    const ab = rounds.flat().find(
      (match) =>
        [match.p1, match.p2].sort().join('|') === ['A', 'B'].join('|')
    )
    const cd = rounds.flat().find(
      (match) =>
        [match.p1, match.p2].sort().join('|') === ['C', 'D'].join('|')
    )
    const ac = rounds.flat().find(
      (match) =>
        [match.p1, match.p2].sort().join('|') === ['A', 'C'].join('|')
    )
    const bd = rounds.flat().find(
      (match) =>
        [match.p1, match.p2].sort().join('|') === ['B', 'D'].join('|')
    )
    const ad = rounds.flat().find(
      (match) =>
        [match.p1, match.p2].sort().join('|') === ['A', 'D'].join('|')
    )
    const bc = rounds.flat().find(
      (match) =>
        [match.p1, match.p2].sort().join('|') === ['B', 'C'].join('|')
    )

    state = play(state, ab.id, 0, 0)
    state = play(state, cd.id, 0, 0)
    state = play(state, ac.id, 0, 0)
    state = play(state, bd.id, 0, 0)
    state = play(state, ad.id, 1, 1)
    state = play(state, bc.id, 1, 1)

    const standings = roundRobin.getStandings(state)
    const points = standings.map((row) => row.points)
    expect(new Set(points).size).toBe(1)
    // Desempate alfabético determinista entre los cuatro empatados.
    expect(standings.map((row) => row.name)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('uses head-to-head to separate players with equal totals', () => {
    // Ciclo A>B>C>D>A más C>A y B>D:
    //   B y C empatan con 6 puntos (B le ganó a C en el directo)
    //   A y D empatan con 3 puntos (D le ganó a A en el directo)
    // El desempate directo coloca a D por delante de A aunque alfabéticamente
    // A vaya antes.
    let state = roundRobin.create(four)
    const rounds = buildRoundRobinSchedule(four)
    const find = (a, b) =>
      rounds.flat().find(
        (match) =>
          [match.p1, match.p2].sort().join('|') === [a, b].sort().join('|')
      )

    const playBy = (a, b, winner) => {
      const match = find(a, b)
      const first = winner === match.p1 ? 1 : 0
      return play(state, match.id, first, 1 - first)
    }

    state = playBy('A', 'B', 'A')
    state = playBy('B', 'C', 'B')
    state = playBy('C', 'D', 'C')
    state = playBy('A', 'D', 'D')
    state = playBy('A', 'C', 'C')
    state = playBy('B', 'D', 'B')

    const standings = roundRobin.getStandings(state)
    const points = new Map(standings.map((row) => [row.name, row.points]))
    expect(points.get('A')).toBe(3)
    expect(points.get('B')).toBe(6)
    expect(points.get('C')).toBe(6)
    expect(points.get('D')).toBe(3)

    // B le ganó a C en el directo; D le ganó a A.
    expect(standings.map((row) => row.name)).toEqual(['B', 'C', 'D', 'A'])
  })

  it('completes the tournament when every match is played', () => {
    let state = roundRobin.create(four)
    const rounds = buildRoundRobinSchedule(four)
    for (const round of rounds) {
      for (const match of round) {
        state = play(state, match.id, 2, 1)
      }
    }
    const progress = roundRobin.getProgress(state)
    expect(progress).toEqual({ played: 6, total: 6, complete: true })
    expect(roundRobin.getChampion(state)).toBeTruthy()
  })

  it('clears results on reorder without changing seeds or schedule', () => {
    let state = roundRobin.create(four)
    const rounds = buildRoundRobinSchedule(four)
    state = play(state, rounds[0][0].id, 1, 0)
    const scheduleBefore = roundRobin.getSchedule(state).map((round) =>
      round.map((match) => ({ id: match.id, p1: match.p1, p2: match.p2 }))
    )
    const reordered = roundRobin.reorder(state)
    expect(reordered.seeds).toEqual(state.seeds)
    expect(reordered.results).toEqual({})
    const scheduleAfter = roundRobin.getSchedule(reordered).map((round) =>
      round.map((match) => ({ id: match.id, p1: match.p1, p2: match.p2 }))
    )
    expect(scheduleAfter).toEqual(scheduleBefore)
  })

  it('round-trips through encode and decode', () => {
    let state = roundRobin.create(five)
    const rounds = buildRoundRobinSchedule(five)
    state = play(state, rounds[0][0].id, 3, 0)
    state = play(state, rounds[1][1].id, 1, 1)

    const payload = roundRobin.encode(state, { players: five })
    expect(payload).not.toBeNull()
    expect(payload.r).toHaveLength(2)

    const decoded = roundRobin.decode(payload, { players: five })
    expect(decoded.results).toEqual(state.results)
    expect(roundRobin.getStandings(decoded)).toEqual(
      roundRobin.getStandings(state)
    )
  })

  it('keeps the double round option when encoding and decoding', () => {
    const state = roundRobin.create(five, { doubleRound: true })
    const payload = roundRobin.encode(state, { players: five })
    const decoded = roundRobin.decode(payload, {
      players: five,
      options: { doubleRound: true },
    })
    expect(decoded.options.doubleRound).toBe(true)
    expect(roundRobin.getSchedule(decoded)).toHaveLength(10)
  })

  it('validates the setup and the state shape', () => {
    expect(roundRobin.validateSetup(['A', 'B']).ok).toBe(true)
    expect(roundRobin.validateSetup(['A']).ok).toBe(false)
    expect(roundRobin.validateState(roundRobin.create(four))).toBe(true)
    expect(roundRobin.validateState({ seeds: 3 })).toBe(false)
  })

  it('honours custom points for wins and draws', () => {
    let state = roundRobin.create(four, { pointsWin: 2, pointsDraw: 1 })
    const rounds = buildRoundRobinSchedule(four)
    state = play(state, rounds[0][0].id, 1, 0)
    state = play(state, rounds[0][1].id, 1, 1)
    const standings = roundRobin.getStandings(state)
    expect(standings[0].points).toBe(2)
    expect(standings[1].points).toBe(1)
  })
})
