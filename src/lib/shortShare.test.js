import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildBracket } from './bracket.js'
import { createSnapshot, encodeSharePayload } from './sessionSnapshot.js'

const firebaseState = vi.hoisted(() => ({
  configured: false,
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}))

vi.mock('./firebase.js', () => ({
  isFirebaseConfigured: () => firebaseState.configured,
  getDb: () => (firebaseState.configured ? { _: 'db' } : null),
}))

vi.mock('firebase/firestore', () => ({
  doc: (_db, collection, id) => ({ collection, id }),
  getDoc: (...args) => firebaseState.getDoc(...args),
  setDoc: (...args) => firebaseState.setDoc(...args),
  serverTimestamp: () => ({ _kind: 'serverTimestamp' }),
}))

import {
  SHARE_ID_ALPHABET,
  buildShortShareUrl,
  createShortShare,
  createShareUrl,
  generateShareId,
  isShortShareHash,
  isShortShareId,
  loadShortShare,
  shouldClearShareHashAfterLoad,
} from './shortShare.js'

const sampleCompetition = {
  tournamentName: 'Copa Pixel',
  tournamentFormat: 'Eliminación simple',
  tournamentPlayers: ['NovaStrike', 'PixelWolf', 'ShadowByte', 'LagKiller'],
}

describe('shortShare', () => {
  beforeEach(() => {
    firebaseState.configured = false
    firebaseState.getDoc.mockReset()
    firebaseState.setDoc.mockReset()
  })

  it('generates ids from the share alphabet', () => {
    const id = generateShareId()
    expect(id).toHaveLength(6)
    expect([...id].every((ch) => SHARE_ID_ALPHABET.includes(ch))).toBe(true)
  })

  it('detects short ids vs v1/v2 payloads', () => {
    expect(isShortShareId('Ab3Xk9')).toBe(false)
    expect(isShortShareId('234ABC')).toBe(true)
    expect(isShortShareId('v2.abc')).toBe(false)
    expect(isShortShareId('v1.abc')).toBe(false)
    expect(isShortShareId('short!')).toBe(false)
  })

  it('detects short hash fragments', () => {
    expect(isShortShareHash('#s=234ABC')).toBe(true)
    expect(isShortShareHash('#s=v2.payload')).toBe(false)
  })

  it('clears hash after load only for long embedded payloads', () => {
    expect(shouldClearShareHashAfterLoad('234ABC')).toBe(false)
    expect(shouldClearShareHashAfterLoad('v2.abc.def')).toBe(true)
    expect(shouldClearShareHashAfterLoad('v1.legacy')).toBe(true)
    expect(shouldClearShareHashAfterLoad('')).toBe(false)
  })

  it('builds short share URLs', () => {
    expect(
      buildShortShareUrl('234ABC', {
        origin: 'https://example.com',
        pathname: '/app/',
      })
    ).toBe('https://example.com/app/#s=234ABC')
  })

  it('skips Firestore when Firebase is not configured', async () => {
    const snap = createSnapshot({
      view: 'setup',
      competitionData: sampleCompetition,
      bracket: null,
    })
    await expect(createShortShare(snap)).resolves.toBeNull()
    await expect(loadShortShare('234ABC')).resolves.toBeNull()
    const url = await createShareUrl(snap, {
      origin: 'https://example.com',
      pathname: '/',
    })
    expect(url).toMatch(/^https:\/\/example\.com\/#s=v2\./)
  })

  it('creates and loads a short share when Firestore is available', async () => {
    firebaseState.configured = true
    const bracket = buildBracket(sampleCompetition.tournamentPlayers)
    const snap = createSnapshot({
      view: 'competition',
      competitionData: sampleCompetition,
      bracket,
    })
    const payload = encodeSharePayload(snap)
    expect(payload).toBeTruthy()

    firebaseState.getDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ payload, v: 1 }),
      })
    firebaseState.setDoc.mockResolvedValue(undefined)

    const id = await createShortShare(snap)
    expect(id).toHaveLength(6)
    expect(firebaseState.setDoc).toHaveBeenCalled()
    await expect(loadShortShare(id)).resolves.toBe(payload)
  })
})
