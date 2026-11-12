import { describe, it, expect } from 'vitest'
import {
  parsePlayers,
  normalizeName,
  dedupePlayers,
  validatePlayersInput,
  serializePlayers,
} from './players.js'

describe('normalizeName', () => {
  it('trims and collapses spaces without lowercasing', () => {
    expect(normalizeName('  NovaStrike ')).toBe('NovaStrike')
    expect(normalizeName('  Ace   Hunter ')).toBe('Ace Hunter')
  })

  it('returns empty string for nullish', () => {
    expect(normalizeName(null)).toBe('')
    expect(normalizeName(undefined)).toBe('')
  })
})

describe('parsePlayers', () => {
  it('parses a comma-separated string preserving casing', () => {
    expect(parsePlayers('Ana, NovaStrike, CARLA')).toEqual([
      'Ana',
      'NovaStrike',
      'CARLA',
    ])
  })

  it('parses newline-separated string', () => {
    expect(parsePlayers('Ana\nNovaStrike\nCARLA')).toEqual([
      'Ana',
      'NovaStrike',
      'CARLA',
    ])
  })

  it('parses mixed commas and newlines', () => {
    expect(parsePlayers('Ana, NovaStrike\nCarla')).toEqual([
      'Ana',
      'NovaStrike',
      'Carla',
    ])
  })

  it('parses an array', () => {
    expect(parsePlayers([' ana ', 'Bob'])).toEqual(['ana', 'Bob'])
  })

  it('drops empty segments', () => {
    expect(parsePlayers('Ana,, ,Bob')).toEqual(['Ana', 'Bob'])
  })

  it('dedupes case-insensitively', () => {
    expect(parsePlayers('Ana, ana, BOB, bob')).toEqual(['Ana', 'BOB'])
  })

  it('returns empty for non-string/non-array', () => {
    expect(parsePlayers(null)).toEqual([])
    expect(parsePlayers(42)).toEqual([])
  })
})

describe('serializePlayers', () => {
  it('joins players with newlines', () => {
    expect(serializePlayers(['Ana', 'Bob'])).toBe('Ana\nBob')
  })
})

describe('dedupePlayers', () => {
  it('keeps first casing and flags duplicates', () => {
    expect(dedupePlayers(['Ana', 'ana', 'Bob'])).toEqual({
      players: ['Ana', 'Bob'],
      hadDuplicates: true,
    })
  })
})

describe('validatePlayersInput', () => {
  it('accepts two or more players', () => {
    const result = validatePlayersInput('Ana, Bob')
    expect(result.ok).toBe(true)
    expect(result.players).toEqual(['Ana', 'Bob'])
    expect(result.error).toBeNull()
  })

  it('accepts newline lists', () => {
    const result = validatePlayersInput('Ana\nBob\nCarla')
    expect(result.ok).toBe(true)
    expect(result.players).toEqual(['Ana', 'Bob', 'Carla'])
  })

  it('rejects empty input', () => {
    const result = validatePlayersInput('   ')
    expect(result.ok).toBe(false)
    expect(result.players).toEqual([])
    expect(result.error).toMatch(/al menos 2/i)
  })

  it('rejects fewer than 2 players', () => {
    const result = validatePlayersInput('Solo')
    expect(result.ok).toBe(false)
    expect(result.players).toEqual(['Solo'])
    expect(result.error).toMatch(/al menos 2/i)
  })

  it('warns on duplicates but stays ok when enough remain', () => {
    const result = validatePlayersInput('Ana, ana, Bob')
    expect(result.ok).toBe(true)
    expect(result.players).toEqual(['Ana', 'Bob'])
    expect(result.hadDuplicates).toBe(true)
    expect(result.error).toMatch(/duplicados/i)
  })

  it('fails when duplicates leave fewer than min', () => {
    const result = validatePlayersInput('Ana, ana')
    expect(result.ok).toBe(false)
    expect(result.players).toEqual(['Ana'])
    expect(result.hadDuplicates).toBe(true)
  })
})
