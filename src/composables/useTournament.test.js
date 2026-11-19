import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { useTournament } from './useTournament.js'
import { singleElimination } from '../lib/formats/singleElimination.js'

describe('useTournament', () => {
  it('creates an initial tournament from players', () => {
    const { state, champion } = useTournament('e', null, ['Ana', 'Bob', 'Carla', 'Dan'])
    expect(state.value.seeds).toEqual(['Ana', 'Bob', 'Carla', 'Dan'])
    expect(state.value.rounds).toHaveLength(2)
    expect(champion.value).toBeNull()
  })

  it('restores a tournament state', () => {
    const snapshot = singleElimination.create(['Ana', 'Bob'])
    snapshot.rounds[0][0].winner = 'Ana'
    const { state, champion, restore } = useTournament('e', null, [])
    restore(snapshot)
    expect(state.value.rounds[0][0].winner).toBe('Ana')
    expect(champion.value).toBe('Ana')
  })

  it('accepts Vue reactive proxies without DataCloneError', () => {
    const plain = singleElimination.create(['Ana', 'Bob'])
    plain.rounds[0][0].winner = 'Ana'
    const proxied = reactive(plain)

    expect(() => useTournament('e', proxied, [])).not.toThrow()
    const { state, champion, restore } = useTournament('e', proxied, [])
    expect(state.value.rounds[0][0].winner).toBe('Ana')
    expect(champion.value).toBe('Ana')

    expect(() => restore(proxied)).not.toThrow()
    expect(state.value.seeds).toEqual(['Ana', 'Bob'])
  })

  it('applies results without throwing to the UI layer', () => {
    const { applyResult, champion } = useTournament('e', null, ['Ana', 'Bob'])
    const ok = applyResult('r0-m0', { winner: 'Ana' })
    expect(ok.ok).toBe(true)
    expect(champion.value).toBe('Ana')

    const bad = applyResult('missing', { winner: 'Ana' })
    expect(bad.ok).toBe(false)
    expect(bad.error).toBeTruthy()
  })

  it('rebuilds and reorders the tournament', () => {
    const { state, rebuild, reorder } = useTournament('e', null, [
      'Ana',
      'Bob',
      'Carla',
      'Dan',
    ])
    rebuild(['Eva', 'Fran'])
    expect(state.value.seeds).toEqual(['Eva', 'Fran'])
    reorder()
    expect(state.value.seeds.sort()).toEqual(['Eva', 'Fran'])
  })

  it('falls back to single elimination for an unknown format', () => {
    const { format } = useTournament('zzz', null, ['Ana', 'Bob'])
    expect(format.id).toBe('e')
  })
})
