import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { useBracket } from './useBracket.js'
import { buildBracket } from '../lib/bracket.js'

describe('useBracket smoke', () => {
  it('builds an initial bracket from players', () => {
    const { bracket, champion } = useBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    expect(bracket.value.seeds).toEqual(['Ana', 'Bob', 'Carla', 'Dan'])
    expect(bracket.value.rounds).toHaveLength(2)
    expect(champion.value).toBeNull()
  })

  it('restores a bracket snapshot', () => {
    const snapshot = buildBracket(['Ana', 'Bob'])
    snapshot.rounds[0][0].winner = 'Ana'
    const { bracket, champion, restore } = useBracket([])
    restore(snapshot)
    expect(bracket.value.rounds[0][0].winner).toBe('Ana')
    expect(champion.value).toBe('Ana')
  })

  it('accepts Vue reactive proxies without DataCloneError', () => {
    const plain = buildBracket(['Ana', 'Bob'])
    plain.rounds[0][0].winner = 'Ana'
    const proxied = reactive(plain)

    expect(() => useBracket([], proxied)).not.toThrow()
    const { bracket, champion, restore } = useBracket([], proxied)
    expect(bracket.value.rounds[0][0].winner).toBe('Ana')
    expect(champion.value).toBe('Ana')

    expect(() => restore(proxied)).not.toThrow()
    expect(bracket.value.seeds).toEqual(['Ana', 'Bob'])
  })

  it('advances winners without throwing to the UI layer', () => {
    const { advance, champion } = useBracket(['Ana', 'Bob'])
    const ok = advance('r0-m0', 'Ana')
    expect(ok.ok).toBe(true)
    expect(champion.value).toBe('Ana')

    const bad = advance('missing', 'Ana')
    expect(bad.ok).toBe(false)
    expect(bad.error).toBeTruthy()
  })

  it('rebuilds and reshuffles seeds', () => {
    const { bracket, rebuild, reshuffle } = useBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    rebuild(['Eva', 'Fran'])
    expect(bracket.value.seeds).toEqual(['Eva', 'Fran'])
    reshuffle()
    expect(bracket.value.seeds.sort()).toEqual(['Eva', 'Fran'])
  })
})
