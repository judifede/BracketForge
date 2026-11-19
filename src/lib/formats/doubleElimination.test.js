import { describe, it, expect } from 'vitest'
import {
  doubleElimination,
  resolveDoubleElimination,
  buildDoubleEliminationStructure,
} from './doubleElimination.js'

const eight = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const six = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Juega un partido del torneo y devuelve el estado actualizado.
 * @param {object} state
 * @param {string} matchId
 * @param {string} winner
 */
function play(state, matchId, winner) {
  return doubleElimination.applyResult(state, matchId, { winner })
}

/**
 * Todos los partidos disputables del torneo resuelto.
 * @param {object} state
 */
function contested(state) {
  const resolved = doubleElimination.resolve(state)
  const all = [
    ...resolved.winners.flat(),
    ...resolved.losers.flat(),
    ...resolved.grandFinal,
  ]
  return all.filter((match) => match.p1 != null && match.p2 != null)
}

/**
 * Jugadores con dos derrotas (eliminados).
 * @param {object} state
 */
function eliminated(state) {
  const resolved = doubleElimination.resolve(state)
  const losses = new Map()
  const count = (match) => {
    if (match.p1 == null || match.p2 == null || !match.winner) return
    const loser = match.winner === match.p1 ? match.p2 : match.p1
    losses.set(loser, (losses.get(loser) ?? 0) + 1)
  }
  for (const round of resolved.winners) round.forEach(count)
  for (const round of resolved.losers) round.forEach(count)
  resolved.grandFinal.forEach(count)
  return new Set(
    [...losses.entries()].filter(([, total]) => total >= 2).map(([name]) => name)
  )
}

/**
 * PRNG determinista (mulberry32) para las pruebas de aleatoriedad.
 * @param {number} seed
 * @returns {() => number}
 */
function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('doubleElimination fuzz', () => {
  it('always ends with one champion and everyone else eliminated', () => {
    for (let size = 2; size <= 12; size += 1) {
      const players = Array.from({ length: size }, (_, i) => `P${i + 1}`)

      for (let seed = 1; seed <= 12; seed += 1) {
        const random = seededRandom(seed * 1000 + size)
        let state = doubleElimination.create(players)

        let guard = 0
        while (!doubleElimination.getChampion(state) && guard < 200) {
          guard += 1
          const pending = contested(state).filter((match) => !match.winner)
          if (!pending.length) break
          const match = pending[Math.floor(random() * pending.length)]
          const winner = random() < 0.5 ? match.p1 : match.p2
          state = play(state, match.id, winner)
        }

        const champion = doubleElimination.getChampion(state)
        expect(champion, `size=${size} seed=${seed}`).toBeTruthy()
        expect(players).toContain(champion)

        // Con una sola GF, el campeón de WB puede quedar fuera con 1 derrota
        // (si pierde la gran final). El resto de no-campeones tienen 2.
        const out = eliminated(state)
        const gf = doubleElimination.resolve(state).grandFinal[0]
        const gfLoser =
          gf?.winner && gf.p1 && gf.p2
            ? gf.winner === gf.p1
              ? gf.p2
              : gf.p1
            : null

        expect(out.has(champion), `size=${size} seed=${seed}`).toBe(false)
        for (const player of players) {
          if (player === champion) continue
          const removed = out.has(player) || player === gfLoser
          expect(removed, `size=${size} seed=${seed} player=${player}`).toBe(
            true
          )
        }
      }
    }
  })

  it('never leaves a result on a match that no longer exists', () => {
    for (let size = 4; size <= 10; size += 1) {
      const players = Array.from({ length: size }, (_, i) => `P${i + 1}`)
      const random = seededRandom(size * 77)

      let state = doubleElimination.create(players)
      let guard = 0
      while (guard < 40) {
        guard += 1
        const pending = contested(state).filter((match) => !match.winner)
        if (!pending.length) break
        const match = pending[Math.floor(random() * pending.length)]
        const winner = random() < 0.5 ? match.p1 : match.p2
        state = play(state, match.id, winner)

        // Todos los resultados guardados deben seguir siendo válidos.
        const resolved = doubleElimination.resolve(state)
        for (const id of Object.keys(state.results)) {
          expect(
            doubleElimination.findMatch(resolved, id),
            `size=${size} resultado huérfano ${id}`
          ).not.toBeNull()
        }
      }
    }
  })
})

describe('buildDoubleEliminationStructure', () => {
  it('builds the winners and losers brackets for 8 players', () => {
    const structure = buildDoubleEliminationStructure(eight)
    expect(structure.size).toBe(8)
    expect(structure.k).toBe(3)
    expect(structure.winners.map((r) => r.length)).toEqual([4, 2, 1])
    expect(structure.losers.map((r) => r.length)).toEqual([2, 2, 1, 1])
    expect(structure.grandFinal.map((m) => m.id)).toEqual(['gf-m0'])
  })

  it('builds 16 player brackets with 6 losers rounds', () => {
    const structure = buildDoubleEliminationStructure(
      Array.from({ length: 16 }, (_, i) => `P${i + 1}`)
    )
    expect(structure.winners.map((r) => r.length)).toEqual([8, 4, 2, 1])
    expect(structure.losers.map((r) => r.length)).toEqual([4, 4, 2, 2, 1, 1])
  })

  it('pads with byes at the end of the first round', () => {
    const structure = buildDoubleEliminationStructure(six)
    expect(structure.size).toBe(8)
    expect(structure.winners[0][2]).toMatchObject({ p1: 'E', p2: 'F' })
    expect(structure.winners[0][3]).toMatchObject({ p1: null, p2: null })
  })

  it('handles the degenerate two player case', () => {
    const structure = buildDoubleEliminationStructure(['A', 'B'])
    expect(structure.size).toBe(2)
    expect(structure.k).toBe(1)
    expect(structure.winners).toHaveLength(1)
    expect(structure.losers).toHaveLength(0)
  })
})

describe('doubleElimination engine', () => {
  it('starts with no champion and no played matches', () => {
    const state = doubleElimination.create(eight)
    expect(doubleElimination.getChampion(state)).toBeNull()
    // 14 partidos disputables: 7 de WB + 6 de LB + 1 de gran final (2N-2).
    expect(doubleElimination.getProgress(state)).toMatchObject({
      played: 0,
      total: 14,
    })
  })

  it('rejects a winner that is not a participant', () => {
    const state = doubleElimination.create(eight)
    expect(() => play(state, 'wb-r0-m0', 'Z')).toThrow(/no participa/)
  })

  it('rejects a result on a match that does not exist', () => {
    const state = doubleElimination.create(eight)
    expect(() => play(state, 'nope', 'A')).toThrow(/no encontrado/)
  })

  it('propagates the winners bracket winner into the semifinal', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    const resolved = doubleElimination.resolve(state)
    expect(resolved.winners[1][0].p1).toBe('A')
    expect(resolved.winners[1][0].p2).toBeNull()
  })

  it('drops the loser of the winners bracket into the losers bracket', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    const resolved = doubleElimination.resolve(state)
    // El perdedor de wb-r0-m0 es B y cae en lb-r0-m0.
    expect(resolved.losers[0][0]).toMatchObject({ p1: 'B', p2: null })
  })

  it('pairs the first losers round from adjacent first round losers', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A') // B cae
    state = play(state, 'wb-r0-m1', 'C') // D cae
    const resolved = doubleElimination.resolve(state)
    expect(resolved.losers[0][0]).toMatchObject({ p1: 'B', p2: 'D' })
  })

  it('runs a full 8 player tournament to a single champion', () => {
    let state = doubleElimination.create(eight)
    let guard = 0
    while (!doubleElimination.getChampion(state) && guard < 50) {
      guard += 1
      const pending = contested(state).filter((match) => !match.winner)
      if (!pending.length) break
      state = play(state, pending[0].id, pending[0].p1)
    }

    const champion = doubleElimination.getChampion(state)
    expect(champion).toBeTruthy()
    expect(eight).toContain(champion)

    const out = eliminated(state)
    for (const player of eight) {
      if (player === champion) continue
      expect(out.has(player)).toBe(true)
    }
    expect(out.size).toBe(7)
  })

  it('plays exactly 14 matches in a full 8 player tournament', () => {
    let state = doubleElimination.create(eight)
    let guard = 0
    while (!doubleElimination.getChampion(state) && guard < 50) {
      guard += 1
      const pending = contested(state).filter((match) => !match.winner)
      if (!pending.length) break
      state = play(state, pending[0].id, pending[0].p1)
    }
    // 2N-2 = 14 con reset desactivado y sin/byes.
    const played = Object.keys(state.results).length
    expect(played).toBe(14)
  })

  it('never eliminates a player with a single loss', () => {
    let state = doubleElimination.create(eight)
    let guard = 0
    while (!doubleElimination.getChampion(state) && guard < 50) {
      guard += 1
      const pending = contested(state).filter((match) => !match.winner)
      if (!pending.length) break
      state = play(state, pending[0].id, pending[0].p1)
    }
    const champion = doubleElimination.getChampion(state)
    const out = eliminated(state)
    expect(out.has(champion)).toBe(false)
    expect(out.size).toBe(eight.length - 1)
  })

  it('re-derives the losers bracket when a winners result changes', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    expect(doubleElimination.resolve(state).losers[0][0].p1).toBe('B')

    state = play(state, 'wb-r0-m0', 'B')
    const resolved = doubleElimination.resolve(state)
    expect(resolved.winners[0][0].winner).toBe('B')
    expect(resolved.losers[0][0].p1).toBe('A')
  })

  it('invalidates a downstream result when its participants change', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    state = play(state, 'wb-r0-m1', 'C')
    state = play(state, 'lb-r0-m0', 'B') // B gana el partido de perdedores

    expect(doubleElimination.resolve(state).losers[0][0].winner).toBe('B')

    // Si el resultado de WB cambia, el ganador de la LB deja de ser válido.
    state = play(state, 'wb-r0-m0', 'B')
    const resolved = doubleElimination.resolve(state)
    expect(resolved.losers[0][0].winner).toBeNull()
    expect(state.results['lb-r0-m0']).toBeUndefined()
  })

  it('handles byes without leaving phantom matches', () => {
    let state = doubleElimination.create(six)
    let guard = 0
    while (!doubleElimination.getChampion(state) && guard < 50) {
      guard += 1
      const pending = contested(state).filter((match) => !match.winner)
      if (!pending.length) break
      state = play(state, pending[0].id, pending[0].p1)
    }

    const champion = doubleElimination.getChampion(state)
    expect(champion).toBeTruthy()

    const out = eliminated(state)
    for (const player of six) {
      if (player === champion) continue
      expect(out.has(player)).toBe(true)
    }
    expect(out.size).toBe(5)
  })

  it('auto-advances a losers match when its rival slot is a real bye', () => {
    // Con 6 participantes el cuadro es de 8 y la última pareja de WB es un
    // descanso doble: ese slot de la LB queda vacío y el rival avanza solo.
    let state = doubleElimination.create(six)
    state = play(state, 'wb-r0-m2', 'E') // F cae a la LB
    const resolved = doubleElimination.resolve(state)
    const match = resolved.losers[0][1]
    expect(match.p1).toBe('F')
    expect(match.p2).toBeNull()
    expect(match.status).toBe('bye')
    expect(match.winner).toBe('F')
  })

  it('waits for the rival instead of advancing when it is simply undecided', () => {
    let state = doubleElimination.create(six)
    state = play(state, 'wb-r0-m0', 'A') // B cae a la LB
    const resolved = doubleElimination.resolve(state)
    const match = resolved.losers[0][0]
    expect(match.p1).toBe('B')
    expect(match.status).toBe('pending')
    expect(match.winner).toBeNull()
  })

  it('plays the grand final between both bracket champions', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    state = play(state, 'wb-r0-m1', 'C')
    state = play(state, 'wb-r0-m2', 'E')
    state = play(state, 'wb-r0-m3', 'G')
    state = play(state, 'wb-r1-m0', 'A')
    state = play(state, 'wb-r1-m1', 'E')
    state = play(state, 'wb-r2-m0', 'A') // campeón de WB

    const resolved = doubleElimination.resolve(state)
    expect(resolved.grandFinal[0].p1).toBe('A')
    expect(resolved.grandFinal[0].p2).toBeNull()
  })

  it('crowns the losers champion when they win the single grand final', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    state = play(state, 'wb-r0-m1', 'C')
    state = play(state, 'wb-r0-m2', 'E')
    state = play(state, 'wb-r0-m3', 'G')
    state = play(state, 'wb-r1-m0', 'A')
    state = play(state, 'wb-r1-m1', 'E')
    state = play(state, 'wb-r2-m0', 'A') // campeón de WB
    state = play(state, 'lb-r0-m0', 'B')
    state = play(state, 'lb-r0-m1', 'F')
    state = play(state, 'lb-r1-m0', 'B')
    state = play(state, 'lb-r1-m1', 'F')
    state = play(state, 'lb-r2-m0', 'B')
    state = play(state, 'lb-r3-m0', 'B') // campeón de la LB

    const before = doubleElimination.resolve(state)
    expect(before.grandFinal).toHaveLength(1)
    expect(before.grandFinal[0].p1).toBe('A')
    expect(before.grandFinal[0].p2).toBe('B')

    // B (campeón de LB) gana la GF: una sola partida decide el campeón.
    state = play(state, 'gf-m0', 'B')
    const after = doubleElimination.resolve(state)
    expect(after.grandFinal).toHaveLength(1)
    expect(doubleElimination.getChampion(state)).toBe('B')
  })

  it('crowns the winners champion when they win the grand final', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    state = play(state, 'wb-r0-m1', 'C')
    state = play(state, 'wb-r0-m2', 'E')
    state = play(state, 'wb-r0-m3', 'G')
    state = play(state, 'wb-r1-m0', 'A')
    state = play(state, 'wb-r1-m1', 'E')
    state = play(state, 'wb-r2-m0', 'A')
    state = play(state, 'lb-r0-m0', 'B')
    state = play(state, 'lb-r0-m1', 'F')
    state = play(state, 'lb-r1-m0', 'B')
    state = play(state, 'lb-r1-m1', 'F')
    state = play(state, 'lb-r2-m0', 'B')
    state = play(state, 'lb-r3-m0', 'B')

    state = play(state, 'gf-m0', 'A')
    const resolved = doubleElimination.resolve(state)
    expect(resolved.grandFinal).toHaveLength(1)
    expect(doubleElimination.getChampion(state)).toBe('A')
  })

  it('ignores legacy resetGrandFinal options without a second GF', () => {
    let state = doubleElimination.create(eight, { resetGrandFinal: true })
    expect(state.options).toEqual({})

    state = {
      ...state,
      options: { resetGrandFinal: true },
    }
    state = play(state, 'wb-r0-m0', 'A')
    state = play(state, 'wb-r0-m1', 'C')
    state = play(state, 'wb-r0-m2', 'E')
    state = play(state, 'wb-r0-m3', 'G')
    state = play(state, 'wb-r1-m0', 'A')
    state = play(state, 'wb-r1-m1', 'E')
    state = play(state, 'wb-r2-m0', 'A')
    state = play(state, 'lb-r0-m0', 'B')
    state = play(state, 'lb-r0-m1', 'F')
    state = play(state, 'lb-r1-m0', 'B')
    state = play(state, 'lb-r1-m1', 'F')
    state = play(state, 'lb-r2-m0', 'B')
    state = play(state, 'lb-r3-m0', 'B')

    state = play(state, 'gf-m0', 'B')
    const resolved = doubleElimination.resolve(state)
    expect(resolved.grandFinal).toHaveLength(1)
    expect(doubleElimination.getChampion(state)).toBe('B')
  })

  it('reorders seeds and resets the results', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    const reordered = doubleElimination.reorder(state)
    expect([...reordered.seeds].sort()).toEqual([...eight].sort())
    expect(reordered.results).toEqual({})
  })

  it('round-trips through encode and decode', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    state = play(state, 'wb-r0-m1', 'C')

    const payload = doubleElimination.encode(state, { players: eight })
    expect(payload).not.toBeNull()
    expect(payload.r).toEqual([
      [0, 0],
      [1, 2],
    ])

    const decoded = doubleElimination.decode(payload, { players: eight })
    expect(decoded.results).toEqual(state.results)
    expect(doubleElimination.resolve(decoded).winners[0][0].winner).toBe('A')
  })

  it('encodes a non identity seed order', () => {
    const state = doubleElimination.create(['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'])
    const payload = doubleElimination.encode(state, { players: eight })
    expect(payload.s).toEqual([7, 6, 5, 4, 3, 2, 1, 0])
  })

  it('validates the setup and the state shape', () => {
    expect(doubleElimination.validateSetup(['A', 'B']).ok).toBe(true)
    expect(doubleElimination.validateSetup(['A']).ok).toBe(false)
    expect(doubleElimination.validateState(doubleElimination.create(eight))).toBe(true)
    expect(doubleElimination.validateState({ seeds: 'nope' })).toBe(false)
    expect(doubleElimination.validateState(null)).toBe(false)
  })

  it('exposes the brackets for the UI', () => {
    let state = doubleElimination.create(eight)
    state = play(state, 'wb-r0-m0', 'A')
    const brackets = doubleElimination.getBrackets(state)
    expect(brackets.winners.rounds).toHaveLength(3)
    expect(brackets.losers.rounds).toHaveLength(4)
    expect(brackets.winners.labels[2]).toBe('Final')
    expect(brackets.losers.labels[0]).toBe('Perdedores 1')
    expect(brackets.grandFinal.labels[0]).toBe('Gran final')
  })

  it('resolves an empty tournament without crashing', () => {
    const resolved = resolveDoubleElimination([], {}, {})
    expect(resolved.winners).toHaveLength(1)
    expect(resolved.losers).toHaveLength(0)
  })
})
