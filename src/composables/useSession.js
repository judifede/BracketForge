import { computed, ref, watch } from 'vue'
import {
  buildShareUrl,
  clearShareHash,
  createSnapshot,
  decodeSharePayload,
  loadFromLocalStorage,
  readShareHash,
  saveToLocalStorage,
} from '../lib/sessionSnapshot.js'
import {
  createShareUrl as resolveShareUrl,
  isShortShareId,
  loadShortShare,
  shouldClearShareHashAfterLoad,
} from '../lib/shortShare.js'

/** @type {import('vue').Ref<'setup'|'competition'>} */
const view = ref('setup')
/** @type {import('vue').Ref<object|null>} */
const competitionData = ref(null)
/** @type {import('vue').Ref<object|null>} */
const bracket = ref(null)
const hydrated = ref(false)
const shareLoadError = ref(false)

/**
 * Shared app session (singleton).
 */
export function useSession() {
  const snapshot = computed(() =>
    createSnapshot({
      view: view.value,
      competitionData: competitionData.value,
      bracket: bracket.value,
    })
  )

  function persist() {
    if (!hydrated.value) return
    saveToLocalStorage(snapshot.value)
  }

  /**
   * Boot from URL hash `#s=` then localStorage.
   * @returns {Promise<{ fromShare: boolean, error: boolean }>}
   */
  async function hydrate() {
    shareLoadError.value = false
    const sharePayload = readShareHash()
    if (sharePayload) {
      let payloadForDecode = sharePayload
      if (isShortShareId(sharePayload)) {
        const remote = await loadShortShare(sharePayload)
        if (remote) payloadForDecode = remote
        else if (!sharePayload.startsWith('v1.') && !sharePayload.startsWith('v2.')) {
          clearShareHash()
          shareLoadError.value = true
          view.value = 'setup'
          competitionData.value = null
          bracket.value = null
          hydrated.value = true
          return { fromShare: true, error: true }
        }
      }
      const decoded = decodeSharePayload(payloadForDecode)
      if (shouldClearShareHashAfterLoad(sharePayload)) {
        clearShareHash()
      }
      if (decoded) {
        view.value = decoded.view
        competitionData.value = decoded.competitionData
        bracket.value = decoded.bracket
        hydrated.value = true
        persist()
        return { fromShare: true, error: false }
      }
      shareLoadError.value = true
      view.value = 'setup'
      competitionData.value = null
      bracket.value = null
      hydrated.value = true
      return { fromShare: true, error: true }
    }

    const stored = loadFromLocalStorage()
    if (stored) {
      view.value = stored.view
      competitionData.value = stored.competitionData
      bracket.value = stored.bracket
    }
    hydrated.value = true
    return { fromShare: false, error: false }
  }

  /**
   * @param {object} data
   * @param {object|null} [nextBracket]
   */
  function startCompetition(data, nextBracket = null) {
    competitionData.value = {
      ...data,
      tournamentPlayers: Array.isArray(data.tournamentPlayers)
        ? [...data.tournamentPlayers]
        : [],
    }
    bracket.value = nextBracket
    view.value = 'competition'
    persist()
  }

  function goToSetup() {
    view.value = 'setup'
    persist()
  }

  /**
   * @param {object|null} next
   */
  function setBracket(next) {
    bracket.value = next
    persist()
  }

  /**
   * @param {object} data
   */
  function setCompetitionData(data) {
    competitionData.value = {
      ...data,
      tournamentPlayers: Array.isArray(data.tournamentPlayers)
        ? [...data.tournamentPlayers]
        : [],
    }
    persist()
  }

  /**
   * Long v2 hash URL (sync).
   * @returns {string|null}
   */
  function getShareUrl() {
    return buildShareUrl(snapshot.value)
  }

  /**
   * Short Firestore link when configured, else v2 hash URL.
   * @returns {Promise<string|null>}
   */
  async function createShareUrl() {
    return resolveShareUrl(snapshot.value)
  }

  watch(snapshot, () => persist(), { deep: true })

  return {
    view,
    competitionData,
    bracket,
    hydrated,
    shareLoadError,
    snapshot,
    hydrate,
    persist,
    startCompetition,
    goToSetup,
    setBracket,
    setCompetitionData,
    getShareUrl,
    createShareUrl,
  }
}
