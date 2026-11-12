import { describe, it, expect } from 'vitest'
import {
  buildBracket,
  advanceWinner,
  shuffleSeeds,
  nextPowerOfTwo,
  roundLabel,
  rebuildBracketFromWinners,
  collectContestedWinners,
  BYE,
} from './bracket.js'

describe('nextPowerOfTwo', () => {
  it('pads to the next power of two', () => {
    expect(nextPowerOfTwo(1)).toBe(1)
    expect(nextPowerOfTwo(2)).toBe(2)
    expect(nextPowerOfTwo(3)).toBe(4)
    expect(nextPowerOfTwo(5)).toBe(8)
  })
})

describe('buildBracket', () => {
  it('builds rounds for a power-of-two field', () => {
    const bracket = buildBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    expect(bracket.seeds).toEqual(['Ana', 'Bob', 'Carla', 'Dan'])
    expect(bracket.rounds).toHaveLength(2)
    expect(bracket.rounds[0]).toHaveLength(2)
    expect(bracket.rounds[1]).toHaveLength(1)
    expect(bracket.rounds[0][0]).toMatchObject({
      id: 'r0-m0',
      p1: 'Ana',
      p2: 'Bob',
      winner: null,
    })
  })

  it('pads with byes and auto-advances', () => {
    const bracket = buildBracket(['Ana', 'Bob', 'Carla'])
    expect(bracket.rounds[0]).toHaveLength(2)
    const byeMatch = bracket.rounds[0].find(
      (m) => m.p1 == null || m.p2 == null
    )
    expect(byeMatch).toBeTruthy()
    expect(byeMatch.winner).toBeTruthy()
    expect(byeMatch.winner).not.toBe(BYE)

    const final = bracket.rounds[1][0]
    expect(
      final.p1 === byeMatch.winner || final.p2 === byeMatch.winner
    ).toBe(true)
  })
})

describe('advanceWinner', () => {
  it('sets the winner and feeds the next round', () => {
    const bracket = buildBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    const next = advanceWinner(bracket, 'r0-m0', 'Ana')
    expect(next.rounds[0][0].winner).toBe('Ana')
    expect(next.rounds[1][0].p1).toBe('Ana')
    // original unchanged
    expect(bracket.rounds[0][0].winner).toBeNull()
  })

  it('clears downstream when a winner is changed', () => {
    let bracket = buildBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    bracket = advanceWinner(bracket, 'r0-m0', 'Ana')
    bracket = advanceWinner(bracket, 'r0-m1', 'Carla')
    bracket = advanceWinner(bracket, 'r1-m0', 'Ana')
    expect(bracket.rounds[1][0].winner).toBe('Ana')

    bracket = advanceWinner(bracket, 'r0-m0', 'Bob')
    expect(bracket.rounds[0][0].winner).toBe('Bob')
    expect(bracket.rounds[1][0].p1).toBe('Bob')
    expect(bracket.rounds[1][0].winner).toBeNull()
  })

  it('throws for invalid winners or unknown matches', () => {
    const bracket = buildBracket(['Ana', 'Bob'])
    expect(() => advanceWinner(bracket, 'r0-m0', 'Zed')).toThrow()
    expect(() => advanceWinner(bracket, 'missing', 'Ana')).toThrow()
  })
})

describe('rebuildBracketFromWinners', () => {
  it('restores contested winners from a flat list', () => {
    let bracket = buildBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    bracket = advanceWinner(bracket, 'r0-m0', 'Ana')
    bracket = advanceWinner(bracket, 'r0-m1', 'Dan')
    const winners = collectContestedWinners(bracket)
    const restored = rebuildBracketFromWinners(
      ['Ana', 'Bob', 'Carla', 'Dan'],
      winners
    )
    expect(restored).toEqual(bracket)
  })
})

describe('shuffleSeeds', () => {
  it('returns a permutation of the seeds', () => {
    const seeds = ['Ana', 'Bob', 'Carla', 'Dan']
    const shuffled = shuffleSeeds(seeds)
    expect(shuffled.sort()).toEqual([...seeds].sort())
  })
})

describe('roundLabel', () => {
  it('labels final, semifinal and earlier rounds', () => {
    expect(roundLabel(2, 3, 1)).toBe('Final')
    expect(roundLabel(1, 3, 2)).toBe('Semifinal')
    expect(roundLabel(0, 3, 4)).toBe('Ronda de 8')
  })
})
