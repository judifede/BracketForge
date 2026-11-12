import { describe, it, expect } from 'vitest'
import {
  emptySlotLabel,
  playerSlotLabel,
  roundIndexFromMatchId,
} from './slotLabel.js'

describe('emptySlotLabel', () => {
  it('uses Descanso for first-round bye slots', () => {
    expect(emptySlotLabel(0)).toBe('Descanso')
  })

  it('uses Por definir for later TBD slots', () => {
    expect(emptySlotLabel(1)).toBe('Por definir')
    expect(emptySlotLabel(2)).toBe('Por definir')
  })
})

describe('roundIndexFromMatchId', () => {
  it('parses round from match id', () => {
    expect(roundIndexFromMatchId('r0-m0')).toBe(0)
    expect(roundIndexFromMatchId('r2-m1')).toBe(2)
  })
})

describe('playerSlotLabel', () => {
  it('returns the player name when present', () => {
    expect(playerSlotLabel('Ana', 0)).toBe('Ana')
    expect(playerSlotLabel('Bob', { id: 'r1-m0' })).toBe('Bob')
  })

  it('never returns the English BYE literal', () => {
    expect(playerSlotLabel(null, 0)).not.toBe('BYE')
    expect(playerSlotLabel(null, 1)).not.toBe('BYE')
    expect(playerSlotLabel(null, { id: 'r0-m0' })).not.toBe('BYE')
    expect(playerSlotLabel(undefined, 0)).not.toBe('BYE')
  })

  it('maps null to Descanso in round 0 and Por definir later', () => {
    expect(playerSlotLabel(null, 0)).toBe('Descanso')
    expect(playerSlotLabel(null, { id: 'r0-m1' })).toBe('Descanso')
    expect(playerSlotLabel(null, 1)).toBe('Por definir')
    expect(playerSlotLabel(null, { id: 'r1-m0' })).toBe('Por definir')
  })

  it('falls back to Descanso when other side already auto-won', () => {
    expect(
      playerSlotLabel(null, { p1: 'Ana', p2: null, winner: 'Ana' })
    ).toBe('Descanso')
  })
})
