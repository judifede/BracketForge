import { describe, it, expect } from 'vitest'
import {
  THEMES,
  SIZES,
  getThemeById,
  samplePlayers,
  buildPreset,
  buildSurprisePreset,
} from './formPresets.js'
import { listFormats } from '../lib/formats/index.js'
import { validatePlayersInput } from '../utils/players.js'

/** Deterministic RNG that cycles through fixed fractions. */
function sequenceRandom(values) {
  let i = 0
  return () => {
    const value = values[i % values.length]
    i += 1
    return value
  }
}

const implementedFormatIds = listFormats({ onlyImplemented: true }).map(
  (entry) => entry.id
)

describe('formPresets datasets', () => {
  it('exposes sizes useful for SE and RR/Swiss', () => {
    expect(SIZES).toEqual([4, 5, 6, 7, 8, 12, 16])
  })

  it('includes Fútbol, Esports and Amigos with large unique pools', () => {
    const ids = THEMES.map((theme) => theme.id)
    expect(ids).toEqual(expect.arrayContaining(['futbol', 'esports', 'amigos']))
    expect(THEMES.length).toBeGreaterThanOrEqual(3)

    for (const theme of THEMES) {
      expect(theme.label).toBeTruthy()
      expect(theme.nameTemplates.length).toBeGreaterThanOrEqual(1)
      expect(theme.playerPool.length).toBeGreaterThanOrEqual(16)

      const unique = new Set(theme.playerPool.map((name) => name.toLowerCase()))
      expect(unique.size).toBe(theme.playerPool.length)
    }
  })
})

describe('samplePlayers', () => {
  it('returns a unique subset of the requested size', () => {
    const theme = getThemeById('futbol')
    const random = sequenceRandom([0, 0.5, 0.25, 0.9, 0.1, 0.75])
    const players = samplePlayers(theme.playerPool, 8, random)

    expect(players).toHaveLength(8)
    expect(new Set(players).size).toBe(8)
    for (const name of players) {
      expect(theme.playerPool).toContain(name)
    }
  })

  it('throws when size exceeds the pool', () => {
    expect(() => samplePlayers(['A', 'B'], 4)).toThrow(/need at least 4/)
  })
})

describe('buildPreset', () => {
  it('fills valid form fields for a theme and size', () => {
    const theme = getThemeById('esports')
    const random = sequenceRandom([0, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])
    const preset = buildPreset({ themeId: 'esports', size: 4, random })

    expect(theme.nameTemplates).toContain(preset.tournamentName)
    expect(preset.tournamentFormat).toBe('e')
    expect(preset).not.toHaveProperty('tournamentType')

    const lines = preset.tournamentPlayers.split('\n')
    expect(lines).toHaveLength(4)
    expect(new Set(lines).size).toBe(4)
    for (const name of lines) {
      expect(theme.playerPool).toContain(name)
    }

    const validation = validatePlayersInput(preset.tournamentPlayers)
    expect(validation.ok).toBe(true)
    expect(validation.players).toHaveLength(4)
  })

  it('accepts RR/Swiss-friendly sizes', () => {
    const preset = buildPreset({
      themeId: 'futbol',
      size: 5,
      format: 'r',
      random: sequenceRandom([0, 0.1, 0.2, 0.3, 0.4, 0.5]),
    })
    expect(preset.tournamentPlayers.split('\n')).toHaveLength(5)
    expect(preset.tournamentFormat).toBe('r')
  })

  it('is deterministic with an injected RNG', () => {
    const randomA = sequenceRandom([0.2, 0.4, 0.1, 0.9, 0.3, 0.5, 0.7, 0.8])
    const randomB = sequenceRandom([0.2, 0.4, 0.1, 0.9, 0.3, 0.5, 0.7, 0.8])

    expect(buildPreset({ themeId: 'amigos', size: 8, random: randomA })).toEqual(
      buildPreset({ themeId: 'amigos', size: 8, random: randomB })
    )
  })

  it('rejects unknown themes and invalid sizes', () => {
    expect(() => buildPreset({ themeId: 'nope', size: 8 })).toThrow(/Unknown theme/)
    expect(() => buildPreset({ themeId: 'futbol', size: 9 })).toThrow(/Invalid size/)
  })
})

describe('buildSurprisePreset', () => {
  it('returns themeId, size and a form-ready payload with a random format', () => {
    const random = sequenceRandom([
      0.1, // theme
      0.5, // size
      0.2, // format
      // buildPreset: shuffle players + name pick
      0.2, 0.3, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
    ])
    const surprise = buildSurprisePreset({ random })
    const theme = getThemeById(surprise.themeId)

    expect(SIZES).toContain(surprise.size)
    expect(theme.nameTemplates).toContain(surprise.tournamentName)
    expect(implementedFormatIds).toContain(surprise.tournamentFormat)
    expect(surprise).not.toHaveProperty('tournamentType')

    const lines = surprise.tournamentPlayers.split('\n')
    expect(lines).toHaveLength(surprise.size)
    expect(new Set(lines).size).toBe(surprise.size)
    for (const name of lines) {
      expect(theme.playerPool).toContain(name)
    }

    expect(validatePlayersInput(surprise.tournamentPlayers).ok).toBe(true)
  })

  it('keeps an explicitly passed format', () => {
    const surprise = buildSurprisePreset({
      format: 's',
      random: sequenceRandom([0.1, 0.5, 0.2, 0.3, 0, 0.1, 0.2, 0.3, 0.4]),
    })
    expect(surprise.tournamentFormat).toBe('s')
  })

  it('is deterministic with an injected RNG', () => {
    const values = [0, 0.99, 0.25, 0.5, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8]
    expect(buildSurprisePreset({ random: sequenceRandom(values) })).toEqual(
      buildSurprisePreset({ random: sequenceRandom(values) })
    )
  })
})
