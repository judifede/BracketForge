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
/** @type {import('vue').Ref<import('../lib/sessionSnapshot.js').TournamentState|null>} */
const state = ref(null)
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
      state: state.value,
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
        else if (!sharePayload.startsWith('v1.') && !sharePayload.startsWith('v2.') && !sharePayload.startsWith('v3.')) {
          clearShareHash()
          shareLoadError.value = true
          view.value = 'setup'
          competitionData.value = null
          state.value = null
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
        state.value = decoded.state
        hydrated.value = true
        persist()
        return { fromShare: true, error: false }
      }
      shareLoadError.value = true
      view.value = 'setup'
      competitionData.value = null
      state.value = null
      hydrated.value = true
      return { fromShare: true, error: true }
    }

    const stored = loadFromLocalStorage()
    if (stored) {
      view.value = stored.view
      competitionData.value = stored.competitionData
      state.value = stored.state
    }
    hydrated.value = true
    return { fromShare: false, error: false }
  }

  /**
   * @param {object} data
   * @param {object|null} [nextState]
   */
  function startCompetition(data, nextState = null) {
    competitionData.value = {
      ...data,
      tournamentPlayers: Array.isArray(data.tournamentPlayers)
        ? [...data.tournamentPlayers]
        : [],
    }
    state.value = nextState
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
  function setState(next) {
    state.value = next
    persist()
  }

  /**
   * @param {object} data
   */
  function setCompetitionData(data) {
    const next = {
      ...data,
      tournamentPlayers: Array.isArray(data.tournamentPlayers)
        ? [...data.tournamentPlayers]
        : [],
    }
    const formatChanged =
      competitionData.value?.tournamentFormat !== next.tournamentFormat
    competitionData.value = next
    // Evita compartir/rehidratar un motor con el formato equivocado.
    if (formatChanged) state.value = null
    persist()
  }

  /**
   * Long v3 hash URL (sync).
   * @returns {string|null}
   */
  function getShareUrl() {
    return buildShareUrl(snapshot.value)
  }

  /**
   * Short Firestore link when configured, else v3 hash URL.
   * @returns {Promise<string|null>}
   */
  async function createShareUrl() {
    return resolveShareUrl(snapshot.value)
  }

  watch(snapshot, () => persist(), { deep: true })

  return {
    view,
    competitionData,
    state,
    hydrated,
    shareLoadError,
    snapshot,
    hydrate,
    persist,
    startCompetition,
    goToSetup,
    setState,
    setCompetitionData,
    getShareUrl,
    createShareUrl,
  }
}
