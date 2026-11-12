import { describe, it, expect } from 'vitest'
import {
  createSnapshot,
  validateSnapshot,
  encodeSharePayload,
  decodeSharePayload,
  serializeSnapshot,
  parseSnapshot,
  STORAGE_KEY,
  saveToLocalStorage,
  loadFromLocalStorage,
} from './sessionSnapshot.js'
import { buildBracket } from './bracket.js'

const sampleCompetition = {
  tournamentName: 'Copa Pixel',
  tournamentFormat: 'Eliminación simple',
  tournamentPlayers: ['NovaStrike', 'PixelWolf', 'ShadowByte', 'LagKiller'],
}

describe('sessionSnapshot', () => {
  it('validates a full snapshot', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      bracket,
    })
    expect(validateSnapshot(snap)).toEqual(snap)
  })

  it('rejects competition view without competitionData', () => {
    expect(
      validateSnapshot({
        v: 1,
        view: 'competition',
        competitionData: null,
        bracket: null,
      })
    ).toBeNull()
  })

  it('strips legacy tournamentType from competitionData', () => {
    const snap = validateSnapshot({
      v: 1,
      view: 'setup',
      competitionData: {
        ...sampleCompetition,
        tournamentType: 'Copa',
      },
      bracket: null,
    })
    expect(snap?.competitionData).toEqual(sampleCompetition)
    expect(snap?.competitionData).not.toHaveProperty('tournamentType')
  })

  it('round-trips share payload compression', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      bracket,
    })
    const payload = encodeSharePayload(snap)
    expect(payload).toMatch(/^v1\./)
    expect(decodeSharePayload(payload)).toEqual(snap)
  })

  it('parses serialized JSON', () => {
    const snap = createSnapshot({ view: 'setup' })
    expect(parseSnapshot(serializeSnapshot(snap))).toEqual(snap)
  })

  it('saves and loads from a storage stub', () => {
    /** @type {Record<string, string>} */
    const store = {}
    const storage = {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = String(value)
      },
    }
    const snap = createSnapshot({
      view: 'setup',
      competitionData: sampleCompetition,
      bracket: null,
    })
    saveToLocalStorage(snap, storage)
    expect(store[STORAGE_KEY]).toBeTruthy()
    expect(loadFromLocalStorage(storage)).toEqual(snap)
  })
})
