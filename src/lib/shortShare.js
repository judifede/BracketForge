import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './firebase.js'
import {
  buildShareUrl,
  encodeSharePayload,
  readShareHash,
} from './sessionSnapshot.js'

export const SHARE_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const SHARE_ID_LENGTH = 6
const SHARE_ID_PATTERN = new RegExp(`^[${SHARE_ID_ALPHABET}]{${SHARE_ID_LENGTH}}$`)

/**
 * Umbral a partir del cual un enlace con el payload en el hash puede no caber
 * en algunos sitios (WhatsApp, Slack, etc.).
 */
export const LONG_SHARE_THRESHOLD = 8000

/**
 * ¿El enlace es demasiado largo para compartirse con comodidad?
 * @param {unknown} url
 * @returns {boolean}
 */
export function isLongShareUrl(url) {
  return typeof url === 'string' && url.length > LONG_SHARE_THRESHOLD
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isShortShareId(value) {
  if (typeof value !== 'string') return false
  if (
    value.startsWith('v1.') ||
    value.startsWith('v2.') ||
    value.startsWith('v3.')
  ) {
    return false
  }
  return SHARE_ID_PATTERN.test(value)
}

/**
 * @param {number} [length]
 * @returns {string}
 */
export function generateShareId(length = SHARE_ID_LENGTH) {
  let id = ''
  const alphabet = SHARE_ID_ALPHABET
  const max = alphabet.length
  const cryptoObj =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length)
    cryptoObj.getRandomValues(bytes)
    for (let i = 0; i < length; i++) {
      id += alphabet[bytes[i] % max]
    }
    return id
  }
  for (let i = 0; i < length; i++) {
    id += alphabet[Math.floor(Math.random() * max)]
  }
  return id
}

/**
 * @param {import('./sessionSnapshot.js').SessionSnapshot} snapshot
 * @param {{ maxAttempts?: number }} [opts]
 * @returns {Promise<string|null>}
 */
export async function createShortShare(snapshot, opts = {}) {
  if (!isFirebaseConfigured()) return null
  const db = getDb()
  if (!db) return null

  const payload = encodeSharePayload(snapshot)
  if (!payload) return null

  const maxAttempts = opts.maxAttempts ?? 8
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateShareId()
    const ref = doc(db, 'shares', id)
    const existing = await getDoc(ref)
    if (existing.exists()) continue
    try {
      await setDoc(ref, {
        payload,
        createdAt: serverTimestamp(),
        v: 1,
      })
      return id
    } catch {
      // race or rules rejection — try another id
    }
  }
  return null
}

/**
 * @param {string} id
 * @returns {Promise<string|null>}
 */
export async function loadShortShare(id) {
  if (!isShortShareId(id) || !isFirebaseConfigured()) return null
  const db = getDb()
  if (!db) return null
  const ref = doc(db, 'shares', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  return typeof data?.payload === 'string' ? data.payload : null
}

/**
 * @param {string} id
 * @param {{ origin?: string, pathname?: string }} [opts]
 * @returns {string}
 */
export function buildShortShareUrl(id, opts = {}) {
  const origin =
    opts.origin ??
    (typeof location !== 'undefined' ? location.origin : 'http://localhost')
  const pathname =
    opts.pathname ??
    (typeof location !== 'undefined' ? location.pathname : '/')
  return `${origin}${pathname}#s=${id}`
}

/**
 * Prefer Firestore short link; fall back to v2 hash URL.
 * @param {import('./sessionSnapshot.js').SessionSnapshot} snapshot
 * @param {{ origin?: string, pathname?: string }} [opts]
 * @returns {Promise<string|null>}
 */
export async function createShareUrl(snapshot, opts = {}) {
  const shortId = await createShortShare(snapshot)
  if (shortId) return buildShortShareUrl(shortId, opts)
  return buildShareUrl(snapshot, opts)
}

/**
 * @param {string} [hash]
 * @returns {boolean}
 */
export function isShortShareHash(hash) {
  const payload = readShareHash(hash)
  return payload ? isShortShareId(payload) : false
}

/**
 * Long v1/v2 hash payloads are cleared after hydrate; short Firestore ids stay in the URL.
 * @param {string|null|undefined} hashPayload Raw `#s=` value (not the resolved Firestore payload).
 * @returns {boolean}
 */
export function shouldClearShareHashAfterLoad(hashPayload) {
  if (typeof hashPayload !== 'string' || !hashPayload) return false
  return !isShortShareId(hashPayload)
}
