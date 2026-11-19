import { describe, it, expect } from 'vitest'
import { singleElimination } from './singleElimination.js'

const players = ['Ana', 'Bruno', 'Carla', 'Dan']

describe('singleElimination engine', () => {
  it('creates a bracket through the common contract', () => {
    const state = singleElimination.create(players)
    expect(state.seeds).toEqual(players)
    expect(state.rounds).toHaveLength(2)
    expect(singleElimination.getChampion(state)).toBeNull()
    expect(singleElimination.getRoster(state)).toEqual(players)
  })

  it('applies a result without mutating the previous state', () => {
    const state = singleElimination.create(players)
    const next = singleElimination.applyResult(state, 'r0-m0', { winner: 'Ana' })
    expect(next.rounds[0][0].winner).toBe('Ana')
    expect(next.rounds[1][0].p1).toBe('Ana')
    expect(state.rounds[0][0].winner).toBeNull()
  })

  it('rejects a result without a winner', () => {
    const state = singleElimination.create(players)
    expect(() => singleElimination.applyResult(state, 'r0-m0', {})).toThrow()
    expect(() => singleElimination.applyResult(state, 'r0-m0', { winner: '' })).toThrow()
  })

  it('knows when a participant can be picked', () => {
    const state = singleElimination.create(players)
    expect(singleElimination.canPick(state, 'r0-m0', 'Ana')).toBe(true)
    expect(singleElimination.canPick(state, 'r0-m0', null)).toBe(false)
    expect(singleElimination.canPick(state, 'missing', 'Ana')).toBe(false)

    const decided = singleElimination.applyResult(state, 'r0-m0', { winner: 'Ana' })
    expect(singleElimination.canPick(decided, 'r0-m0', 'Ana')).toBe(false)
    expect(singleElimination.canPick(decided, 'r0-m0', 'Bruno')).toBe(true)
  })

  it('reports progress over contested matches only', () => {
    const state = singleElimination.create(['Ana', 'Bob', 'Carla'])
    // 3 jugadores -> 2 rondas. Solo r0-m0 está disputado: el resto espera un rival
    // (descanso o ganador de otra ronda), así que no cuenta como partido.
    expect(singleElimination.getProgress(state)).toEqual({
      played: 0,
      total: 1,
      complete: false,
    })

    const afterFirst = singleElimination.applyResult(state, 'r0-m0', { winner: 'Ana' })
    // Al decidirse, la final pasa a estar disputada: total 2, jugados 1.
    expect(singleElimination.getProgress(afterFirst)).toEqual({
      played: 1,
      total: 2,
      complete: false,
    })

    const finished = singleElimination.applyResult(afterFirst, 'r1-m0', { winner: 'Ana' })
    expect(singleElimination.getProgress(finished)).toEqual({
      played: 2,
      total: 2,
      complete: true,
    })
  })

  it('clones state without sharing nested references', () => {
    const state = singleElimination.create(players)
    const copy = singleElimination.cloneState(state)
    copy.rounds[0][0].winner = 'Ana'
    expect(state.rounds[0][0].winner).toBeNull()
  })

  it('reorders seeds on reorder', () => {
    const state = singleElimination.create(players)
    const reordered = singleElimination.reorder(state)
    expect([...reordered.seeds].sort()).toEqual([...players].sort())
  })

  it('validates setup with a minimum of two players', () => {
    expect(singleElimination.validateSetup(['Ana', 'Bob']).ok).toBe(true)
    expect(singleElimination.validateSetup(['Ana']).ok).toBe(false)
    expect(singleElimination.validateSetup([]).error).toBeTruthy()
  })

  it('validates state shape', () => {
    expect(singleElimination.validateState(singleElimination.create(players))).toBe(true)
    expect(singleElimination.validateState({ rounds: [] })).toBe(false)
    expect(singleElimination.validateState(null)).toBe(false)
  })

  it('encodes and decodes back to an equivalent state', () => {
    let state = singleElimination.create(players)
    state = singleElimination.applyResult(state, 'r0-m0', { winner: 'Ana' })
    state = singleElimination.applyResult(state, 'r0-m1', { winner: 'Carla' })
    state = singleElimination.applyResult(state, 'r1-m0', { winner: 'Ana' })

    const payload = singleElimination.encode(state, { players })
    expect(payload).not.toBeNull()
    expect(payload.w).toEqual([0, 2, 0])

    const restored = singleElimination.decode(payload, { players })
    expect(restored).toEqual(state)
  })

  it('encodes the seed order when it is not the identity order', () => {
    const state = singleElimination.create(['Dan', 'Carla', 'Bruno', 'Ana'])
    const payload = singleElimination.encode(state, { players })
    expect(payload.s).toEqual([3, 2, 1, 0])
  })

  it('rejects payloads with an invalid seed order', () => {
    expect(singleElimination.decode({ s: [0, 1, 2, 9] }, { players })).toBeNull()
    expect(singleElimination.decode({ s: [0, 1] }, { players })).toBeNull()
    expect(singleElimination.decode(null, { players })).toBeNull()
  })

  it('tolerates out-of-range winner indexes by ignoring them', () => {
    // Mismo comportamiento tolerante que el códec legacy v2: un índice inválido
    // se interpreta como "sin ganador" en lugar de invalidar todo el payload.
    const decoded = singleElimination.decode({ w: [9] }, { players })
    expect(decoded).not.toBeNull()
    expect(decoded.rounds[0][0].winner).toBeNull()
  })
})
