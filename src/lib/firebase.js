import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

/** @type {import('firebase/app').FirebaseOptions | null} */
let firebaseConfig = null

/**
 * Read Vite env once; tests can override via `setFirebaseConfigForTests`.
 */
function readConfigFromEnv() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

/**
 * @param {import('firebase/app').FirebaseOptions | null} next
 */
export function setFirebaseConfigForTests(next) {
  firebaseConfig = next
  dbInstance = null
}

/**
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  const cfg = firebaseConfig ?? readConfigFromEnv()
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId)
}

/** @type {import('firebase/firestore').Firestore | null} */
let dbInstance = null

/**
 * Lazy Firestore instance (null when env is incomplete).
 * @returns {import('firebase/firestore').Firestore | null}
 */
export function getDb() {
  if (!isFirebaseConfigured()) return null
  if (dbInstance) return dbInstance
  const cfg = firebaseConfig ?? readConfigFromEnv()
  const app = getApps().length ? getApp() : initializeApp(cfg)
  dbInstance = getFirestore(app)
  return dbInstance
}
