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
  LEGACY_STORAGE_KEY,
  saveToLocalStorage,
  loadFromLocalStorage,
  toCompactShare,
  fromCompactShare,
} from './sessionSnapshot.js'
import { advanceWinner, buildBracket } from './bracket.js'
import { doubleElimination } from './formats/doubleElimination.js'
import { roundRobin, buildRoundRobinSchedule } from './formats/roundRobin.js'
import { swiss } from './formats/swiss.js'

const sampleCompetition = {
  tournamentName: 'Copa Pixel',
  tournamentFormat: 'e',
  tournamentPlayers: ['NovaStrike', 'PixelWolf', 'ShadowByte', 'LagKiller'],
  tournamentOptions: {},
}

/**
 * @param {object[]} players
 * @returns {object}
 */
function competition(players, overrides = {}) {
  return {
    tournamentName: 'Copa Pixel',
    tournamentFormat: 'e',
    tournamentPlayers: players,
    tournamentOptions: {},
    ...overrides,
  }
}

describe('sessionSnapshot', () => {
  it('validates a full snapshot', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      state: { format: 'e', data: bracket },
    })
    expect(validateSnapshot(snap)).toEqual(snap)
    expect(snap.v).toBe(2)
    expect(snap.state.format).toBe('e')
  })

  it('rejects competition view without competitionData', () => {
    expect(
      validateSnapshot({
        v: 2,
        view: 'competition',
        competitionData: null,
        state: null,
      })
    ).toBeNull()
  })

  it('strips unknown competition fields and normalizes the format id', () => {
    const snap = validateSnapshot({
      v: 2,
      view: 'setup',
      competitionData: {
        ...sampleCompetition,
        tournamentFormat: 'Eliminación simple',
        tournamentType: 'Copa',
      },
      state: null,
    })
    expect(snap?.competitionData).toEqual(sampleCompetition)
    expect(snap?.competitionData).not.toHaveProperty('tournamentType')
  })

  it('migrates a v1 snapshot with a legacy bracket', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = validateSnapshot({
      v: 1,
      view: 'competition',
      competitionData: {
        ...sampleCompetition,
        tournamentFormat: 'Eliminación simple',
      },
      bracket,
    })
    expect(snap.v).toBe(2)
    expect(snap.competitionData.tournamentFormat).toBe('e')
    expect(snap.state).toEqual({ format: 'e', data: bracket })
  })

  it('round-trips share payload compression as v3', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      state: { format: 'e', data: bracket },
    })
    const payload = encodeSharePayload(snap)
    expect(payload).toMatch(/^v3\./)
    expect(decodeSharePayload(payload)).toEqual(snap)
  })

  it('round-trips setup-only compact share', () => {
    const snap = createSnapshot({
      view: 'setup',
      competitionData: sampleCompetition,
      state: null,
    })
    const compact = toCompactShare(snap)
    expect(compact).toMatchObject({
      v: 3,
      view: 's',
      n: 'Copa Pixel',
      f: 'e',
      p: sampleCompetition.tournamentPlayers,
    })
    expect(compact).not.toHaveProperty('x')
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
      state: { format: 'e', data: bracket },
    })
    expect(decodeSharePayload(encodeSharePayload(snap))).toEqual(snap)
  })

  it('round-trips v3 share payloads for DE, RR and Swiss', () => {
    const players = ['Ana', 'Bruno', 'Carla', 'Diego']

    let de = doubleElimination.create(players)
    de = doubleElimination.applyResult(de, 'wb-r0-m0', { winner: 'Ana' })
    const deSnap = createSnapshot({
      view: 'competition',
      competitionData: competition(players, { tournamentFormat: 'd' }),
      state: { format: 'd', data: de },
    })
    expect(decodeSharePayload(encodeSharePayload(deSnap))).toEqual(deSnap)

    let rr = roundRobin.create(players)
    const rrMatch = buildRoundRobinSchedule(players)[0][0]
    rr = roundRobin.applyResult(rr, rrMatch.id, { a: 2, b: 1 })
    const rrSnap = createSnapshot({
      view: 'competition',
      competitionData: competition(players, { tournamentFormat: 'r' }),
      state: { format: 'r', data: rr },
    })
    expect(decodeSharePayload(encodeSharePayload(rrSnap))).toEqual(rrSnap)

    let sw = swiss.create(players, { totalRounds: 2 })
    sw = swiss.applyAction(sw, { type: 'generate-round' })
    sw = swiss.applyResult(sw, 'sw-r0-m0', { a: 1, b: 0 })
    const swSnap = createSnapshot({
      view: 'competition',
      competitionData: competition(players, {
        tournamentFormat: 's',
        tournamentOptions: { totalRounds: 2 },
      }),
      state: { format: 's', data: sw },
    })
    expect(decodeSharePayload(encodeSharePayload(swSnap))).toEqual(swSnap)
  })

  it('keeps decoding legacy v2 compact payloads', () => {
    const legacyCompact = {
      v: 2,
      view: 'c',
      n: 'Copa Pixel',
      f: 'e',
      p: sampleCompetition.tournamentPlayers,
      w: [0, 3],
    }
    const decoded = fromCompactShare(legacyCompact)
    expect(decoded?.view).toBe('competition')
    expect(decoded?.competitionData.tournamentFormat).toBe('e')
    expect(decoded?.state?.format).toBe('e')
    expect(decoded?.state?.data.rounds[0][0].winner).toBe('NovaStrike')
    expect(decoded?.state?.data.rounds[0][1].winner).toBe('LagKiller')
  })

  it('still decodes legacy v1 payloads', () => {
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      state: { format: 'e', data: bracket },
    })
    const legacy = encodeSharePayloadV1(snap)
    expect(legacy).toMatch(/^v1\./)
    expect(decodeSharePayload(legacy)).toEqual(snap)
  })
  it('encodes shorter v3 payloads than v1 for an 8-player bracket', () => {
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
      competitionData: competition(players),
      state: { format: 'e', data: bracket },
    })
    const v1 = encodeSharePayloadV1(snap)
    const v3 = encodeSharePayload(snap)
    expect(v1 && v3).toBeTruthy()
    expect(v3.length).toBeLessThan(v1.length)
  })

  it('drops tournament state when it does not match competition format', () => {
    const players = ['Ana', 'Bruno', 'Carla', 'Diego']
    const de = doubleElimination.create(players)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: competition(players, { tournamentFormat: 'r' }),
      state: { format: 'd', data: de },
    })
    expect(snap.state).toBeNull()
    expect(
      validateSnapshot({
        v: 2,
        view: 'competition',
        competitionData: competition(players, { tournamentFormat: 's' }),
        state: { format: 'e', data: buildBracket(players) },
      })?.state
    ).toBeNull()
  })

  it('carries the format options through the compact share', () => {
    const snap = createSnapshot({
      view: 'setup',
      competitionData: competition(['Ana', 'Bob'], {
        tournamentOptions: { pointsWin: 3, doubleRound: true },
      }),
      state: null,
    })
    const compact = toCompactShare(snap)
    expect(compact?.o).toEqual({ pointsWin: 3, doubleRound: true })
    expect(fromCompactShare(compact)?.competitionData.tournamentOptions).toEqual({
      pointsWin: 3,
      doubleRound: true,
    })
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
      state: null,
    })
    saveToLocalStorage(snap, storage)
    expect(store[STORAGE_KEY]).toBeTruthy()
    expect(loadFromLocalStorage(storage)).toEqual(snap)
  })

  it('falls back to the legacy storage key and migrates it', () => {
    /** @type {Record<string, string>} */
    const store = {}
    const storage = {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = String(value)
      },
    }
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    store[LEGACY_STORAGE_KEY] = JSON.stringify({
      v: 1,
      view: 'competition',
      competitionData: {
        ...sampleCompetition,
        tournamentFormat: 'Eliminación simple',
      },
      bracket,
    })

    const loaded = loadFromLocalStorage(storage)
    expect(loaded?.v).toBe(2)
    expect(loaded?.state?.format).toBe('e')
    expect(loaded?.state?.data).toEqual(bracket)
  })
})
