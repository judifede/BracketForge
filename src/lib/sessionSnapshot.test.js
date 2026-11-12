import { describe, it, expect } from 'vitest'
import {
  createSnapshot,
  validateSnapshot,
  encodeSharePayload,
  encodeSharePayloadV1,
  decodeSharePayload,
  serializeSnapshot,
  parseSnapshot,
  STORAGE_KEY,
  saveToLocalStorage,
  loadFromLocalStorage,
  toCompactShare,
  fromCompactShare,
} from './sessionSnapshot.js'
import { advanceWinner, buildBracket } from './bracket.js'

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

  it('round-trips share payload compression as v2', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      bracket,
    })
    const payload = encodeSharePayload(snap)
    expect(payload).toMatch(/^v2\./)
    expect(decodeSharePayload(payload)).toEqual(snap)
  })

  it('round-trips setup-only compact share', () => {
    const snap = createSnapshot({
      view: 'setup',
      competitionData: sampleCompetition,
      bracket: null,
    })
    const compact = toCompactShare(snap)
    expect(compact).toMatchObject({
      v: 2,
      view: 's',
      n: 'Copa Pixel',
      f: 'e',
      p: sampleCompetition.tournamentPlayers,
    })
    expect(compact).not.toHaveProperty('w')
    expect(fromCompactShare(compact)).toEqual(snap)
    expect(decodeSharePayload(encodeSharePayload(snap))).toEqual(snap)
  })

  it('round-trips competition progress with contested winners', () => {
    let bracket = buildBracket(sampleCompetition.tournamentPlayers)
    bracket = advanceWinner(bracket, 'r0-m0', 'NovaStrike')
    bracket = advanceWinner(bracket, 'r0-m1', 'LagKiller')
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      bracket,
    })
    expect(decodeSharePayload(encodeSharePayload(snap))).toEqual(snap)
  })

  it('still decodes legacy v1 payloads', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      bracket,
    })
    const legacy = encodeSharePayloadV1(snap)
    expect(legacy).toMatch(/^v1\./)
    expect(decodeSharePayload(legacy)).toEqual(snap)
  })

  it('encodes shorter v2 payloads than v1 for an 8-player bracket', () => {
    const players = [
      'Ana',
      'Bruno',
      'Carla',
      'Diego',
      'Elena',
      'Felix',
      'Gema',
      'Hugo',
    ]
    let bracket = buildBracket(players)
    bracket = advanceWinner(bracket, 'r0-m0', 'Ana')
    bracket = advanceWinner(bracket, 'r0-m1', 'Carla')
    bracket = advanceWinner(bracket, 'r0-m2', 'Elena')
    bracket = advanceWinner(bracket, 'r0-m3', 'Hugo')
    bracket = advanceWinner(bracket, 'r1-m0', 'Ana')
    bracket = advanceWinner(bracket, 'r1-m1', 'Hugo')
    const snap = createSnapshot({
      view: 'competition',
      competitionData: {
        tournamentName: 'Octavos Demo',
        tournamentFormat: 'Eliminación simple',
        tournamentPlayers: players,
      },
      bracket,
    })
    const v1 = encodeSharePayloadV1(snap)
    const v2 = encodeSharePayload(snap)
    expect(v1 && v2).toBeTruthy()
    expect(v2.length).toBeLessThan(v1.length)
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
