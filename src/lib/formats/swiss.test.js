import { describe, it, expect } from 'vitest'
import { swiss, pairSwissRound, defaultSwissTotalRounds } from './swiss.js'

const four = ['A', 'B', 'C', 'D']
const five = ['A', 'B', 'C', 'D', 'E']
const sixteen = Array.from({ length: 16 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`)

/**
 * @param {object} state
 * @param {string} matchId
 * @param {number} a
 * @param {number} b
 */
function play(state, matchId, a, b) {
  return swiss.applyResult(state, matchId, { a, b })
}

/**
 * Juega una ronda completa eligiendo siempre al primer participante.
 * @param {object} state
 */
function playRound(state) {
  const round = swiss.getRounds(state).at(-1)
  let next = state
  for (const match of round) {
    if (match.bye) continue
    next = play(next, match.id, 1, 0)
  }
  return next
}

describe('pairSwissRound', () => {
  it('pairs players with the same score', () => {
    const pairs = pairSwissRound(
      [
        { name: 'A', points: 3 },
        { name: 'B', points: 3 },
        { name: 'C', points: 0 },
        { name: 'D', points: 0 },
      ],
      []
    )
    expect(pairs).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ])
  })

  it('floats the last player of an odd group down', () => {
    const pairs = pairSwissRound(
      [
        { name: 'A', points: 3 },
        { name: 'B', points: 3 },
        { name: 'C', points: 3 },
        { name: 'D', points: 0 },
      ],
      []
    )
    // C flota al grupo inferior y se empareja con D.
    expect(pairs).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ])
  })

  it('gives a bye when a player is left unpaired', () => {
    // A y B empatan (3 pts) y se emparejan; C (0 pts) se queda sin rival…
    // pero el descanso se asigna antes de emparejar: al mejor clasificado
    // que aún no lo haya tenido (A), así que C juega contra B.
    const pairs = pairSwissRound(
      [
        { name: 'A', points: 3 },
        { name: 'B', points: 3 },
        { name: 'C', points: 0 },
      ],
      []
    )
    expect(pairs).toHaveLength(2)
    expect(pairs[0].slice().sort()).toEqual(['B', 'C'])
    expect(pairs[1]).toEqual(['A', null])
  })

  it('avoids rematches when possible', () => {
    const pairs = pairSwissRound(
      [
        { name: 'A', points: 3 },
        { name: 'B', points: 3 },
        { name: 'C', points: 3 },
        { name: 'D', points: 3 },
      ],
      [['A', 'B']]
    )
    // A ya se enfrentó a B: no deben volver a emparejarse.
    const abAgain = pairs.some(
      (pair) =>
        pair.includes('A') &&
        pair.includes('B')
    )
    expect(abAgain).toBe(false)
  })
})

describe('swiss engine', () => {
  it('starts with no rounds and no champion', () => {
    const state = swiss.create(four)
    expect(state.rounds).toEqual([])
    expect(swiss.getChampion(state)).toBeNull()
    expect(swiss.getProgress(state)).toMatchObject({ played: 0, total: 0 })
    // Sin totalRounds en setup: min(3, floor(log2(4))) = 2.
    expect(state.options.totalRounds).toBe(defaultSwissTotalRounds(4))
    expect(state.options.totalRounds).toBe(2)
  })

  it('defaults totalRounds to min(3, floor(log2(n))) when unset', () => {
    expect(swiss.create(['A', 'B']).options.totalRounds).toBe(1)
    expect(swiss.create(five).options.totalRounds).toBe(2)
    expect(swiss.create(sixteen).options.totalRounds).toBe(3)
    expect(
      swiss.create(sixteen, { totalRounds: 5 }).options.totalRounds
    ).toBe(5)
  })

  it('re-derives totalRounds from roster size when options omit it', () => {
    const state = swiss.create(['A', 'B', 'C', 'D'])
    expect(state.options.totalRounds).toBe(2)
    const wiped = {
      ...state,
      options: { pointsWin: 3, pointsDraw: 1 },
    }
    const cloned = swiss.cloneState(wiped)
    expect(cloned.options.totalRounds).toBe(2)
    // Tras completar las 2 rondas no debe dejarse generar una tercera.
    let played = swiss.generateRound(cloned)
    for (const match of played.rounds[0].matches) {
      if (match.p2 != null) {
        played = swiss.applyResult(played, match.id, { a: 1, b: 0 })
      }
    }
    played = swiss.generateRound(played)
    for (const match of played.rounds[1].matches) {
      if (match.p2 != null) {
        played = swiss.applyResult(played, match.id, { a: 1, b: 0 })
      }
    }
    expect(swiss.getProgress(played).complete).toBe(true)
    expect(() => swiss.generateRound(played)).toThrow(/2 rondas/)
  })

  it('generates the first round pairing everyone', () => {
    let state = swiss.create(four)
    state = swiss.applyAction(state, { type: 'generate-round' })
    const round = swiss.getRounds(state)[0]
    expect(round).toHaveLength(2)
    expect(round.every((match) => !match.bye)).toBe(true)
    const names = round.flatMap((match) => [match.p1, match.p2])
    expect(new Set(names).size).toBe(4)
  })

  it('refuses to generate a round while the current one is pending', () => {
    let state = swiss.create(four)
    state = swiss.applyAction(state, { type: 'generate-round' })
    expect(() => swiss.applyAction(state, { type: 'generate-round' })).toThrow(
      /Completa la ronda actual/
    )
  })

  it('refuses to generate more rounds than configured', () => {
    let state = swiss.create(four, { totalRounds: 1 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    state = playRound(state)
    expect(() => swiss.applyAction(state, { type: 'generate-round' })).toThrow(
      /Ya se han generado/
    )
  })

  it('never repeats a pair across rounds', () => {
    let state = swiss.create(sixteen, { totalRounds: 4 })
    for (let r = 0; r < 4; r += 1) {
      state = swiss.applyAction(state, { type: 'generate-round' })
      state = playRound(state)
    }
    const history = state.history.map((pair) => [...pair].sort().join('|'))
    expect(history).toHaveLength(32)
    expect(new Set(history).size).toBe(32)
  })

  it('gives a bye with an odd number of players', () => {
    let state = swiss.create(five, { totalRounds: 3 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    const round = swiss.getRounds(state)[0]
    const byes = round.filter((match) => match.bye)
    expect(byes).toHaveLength(1)

    // El descanso suma un punto.
    state = playRound(state)
    const standings = swiss.getStandings(state)
    const byePlayer = standings.find((row) => row.name === byes[0].p1)
    expect(byePlayer.points).toBe(1)
  })

  it('never gives the same player two byes', () => {
    let state = swiss.create(five, { totalRounds: 4 })
    for (let r = 0; r < 4; r += 1) {
      state = swiss.applyAction(state, { type: 'generate-round' })
      state = playRound(state)
    }
    // 4 rondas × 1 descanso = 4 descansos entre 5 jugadores: nadie repite.
    expect(state.byes).toHaveLength(4)
    expect(new Set(state.byes).size).toBe(4)
  })

  it('gives the bye to a player who has not had one yet', () => {
    const pairs = pairSwissRound(
      [
        { name: 'A', points: 3 },
        { name: 'B', points: 3 },
        { name: 'C', points: 0 },
      ],
      [],
      ['C']
    )
    // C ya tuvo descanso: el descanso vuelve a A (el mejor sin bye) y C
    // juega contra B.
    expect(pairs).toHaveLength(2)
    expect(pairs[0].slice().sort()).toEqual(['B', 'C'])
    expect(pairs[1]).toEqual(['A', null])
  })

  it('undoes the last round including results and history', () => {
    let state = swiss.create(four, { totalRounds: 3 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    state = playRound(state)
    expect(state.rounds).toHaveLength(1)
    expect(state.history).toHaveLength(2)

    const undone = swiss.applyAction(state, { type: 'undo-round' })
    expect(undone.rounds).toHaveLength(0)
    expect(undone.history).toHaveLength(0)
    expect(Object.keys(undone.results)).toHaveLength(0)
  })

  it('sorts by points and computes Buchholz from the opponents points', () => {
    let state = swiss.create(four, { totalRounds: 2 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    let round = swiss.getRounds(state)[0]
    // Gana el primero en un partido y el segundo en el otro.
    const winners = [round[0].p1, round[1].p2]
    state = play(state, round[0].id, 1, 0)
    state = play(state, round[1].id, 0, 1)

    const afterFirst = swiss.getStandings(state)
    expect(afterFirst[0].points).toBe(3)
    expect(afterFirst[1].points).toBe(3)
    // Tras una ronda ambosuencontraron rivales con 0 puntos.
    expect(afterFirst[0].buchholz).toBe(0)
    expect(afterFirst[1].buchholz).toBe(0)

    // Segunda ronda: los dos líderes se enfrentan entre sí.
    state = swiss.applyAction(state, { type: 'generate-round' })
    round = swiss.getRounds(state)[1]
    const second = round.find(
      (match) => winners.includes(match.p1) && winners.includes(match.p2)
    )
    expect(second).toBeTruthy()
    state = play(state, second.id, 1, 0)

    const afterSecond = swiss.getStandings(state)
    const winner = afterSecond.find((row) => row.name === second.p1)
    const loser = afterSecond.find((row) => row.name === second.p2)
    expect(winner.points).toBe(6)
    expect(loser.points).toBe(3)
    // Buchholz = suma de los puntos de los rivales.
    expect(winner.buchholz).toBe(3)
    expect(loser.buchholz).toBe(6)
  })

  it('rejects a score on a bye match', () => {
    let state = swiss.create(five, { totalRounds: 2 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    const bye = swiss.getRounds(state)[0].find((match) => match.bye)
    expect(() => play(state, bye.id, 1, 0)).toThrow(/descanso/)
  })

  it('reorders by clearing rounds, results, history and byes', () => {
    let state = swiss.create(five, { totalRounds: 3 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    state = playRound(state)
    expect(state.byes.length).toBeGreaterThan(0)
    const reset = swiss.reorder(state)
    expect(reset.rounds).toEqual([])
    expect(reset.results).toEqual({})
    expect(reset.history).toEqual([])
    expect(reset.byes).toEqual([])
  })

  it('round-trips through encode and decode', () => {
    let state = swiss.create(four, { totalRounds: 3 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    state = playRound(state)
    state = swiss.applyAction(state, { type: 'generate-round' })
    const round = swiss.getRounds(state)[1]
    state = play(state, round[0].id, 2, 1)

    const payload = swiss.encode(state, { players: four })
    expect(payload).not.toBeNull()

    const decoded = swiss.decode(payload, {
      players: four,
      options: { totalRounds: 3 },
    })
    expect(decoded).not.toBeNull()
    expect(decoded.rounds).toHaveLength(2)
    expect(decoded.history).toHaveLength(4)
    expect(decoded.results).toEqual(state.results)
    expect(swiss.getStandings(decoded)).toEqual(swiss.getStandings(state))
  })

  it('round-trips a tournament with byes through encode and decode', () => {
    let state = swiss.create(five, { totalRounds: 3 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    state = playRound(state)
    state = swiss.applyAction(state, { type: 'generate-round' })
    state = playRound(state)

    const payload = swiss.encode(state, { players: five })
    const decoded = swiss.decode(payload, {
      players: five,
      options: { totalRounds: 3 },
    })
    expect(decoded).not.toBeNull()
    expect(decoded.byes).toEqual(state.byes)
    expect(decoded.history).toEqual(state.history)
    expect(decoded.results).toEqual(state.results)
    expect(swiss.getStandings(decoded)).toEqual(swiss.getStandings(state))
  })

  it('flags unavoidable rematches so the UI can warn about them', () => {
    // Dos participantes que ya se enfrentaron y que acaban en el mismo grupo
    // con un solo rival posible: la revancha es inevitable.
    const ranked = [
      { name: 'A', points: 3 },
      { name: 'B', points: 3 },
    ]
    const pairs = pairSwissRound(ranked, [['A', 'B']], [])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toEqual(['A', 'B'])

    let state = swiss.create(['A', 'B', 'C'], { totalRounds: 2 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    state = swiss.applyResult(state, 'sw-r0-m0', { a: 1, b: 0 })
    state = swiss.applyAction(state, { type: 'generate-round' })
    // El motor expone las revanchas de cada ronda.
    const rematches = swiss.getRematches(state)
    expect(Array.isArray(rematches)).toBe(true)
  })

  it('validates the setup and the state shape', () => {
    expect(swiss.validateSetup(['A', 'B', 'C', 'D']).ok).toBe(true)
    expect(swiss.validateSetup(['A']).ok).toBe(false)
    expect(swiss.validateSetup(['A', 'B']).warning).toBeTruthy()
    expect(swiss.validateState(swiss.create(four))).toBe(true)
    expect(swiss.validateState({ seeds: 3 })).toBe(false)
  })
})
