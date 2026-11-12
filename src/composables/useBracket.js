import { ref, computed } from 'vue'
import {
  buildBracket,
  advanceWinner,
  shuffleSeeds,
} from '../lib/bracket.js'

/**
 * Reactive single-elimination bracket state.
 * @param {string[]} initialPlayers
 * @param {object|null} [initialBracket]
 */
export function useBracket(initialPlayers = [], initialBracket = null) {
  const bracket = ref(
    initialBracket && Array.isArray(initialBracket.rounds)
      ? structuredClone(initialBracket)
      : buildBracket(initialPlayers)
  )

  const champion = computed(() => {
    const rounds = bracket.value.rounds
    if (!rounds.length) return null
    const final = rounds[rounds.length - 1][0]
    return final?.winner ?? null
  })

  /**
   * @param {string[]} players
   */
  function rebuild(players) {
    bracket.value = buildBracket(players)
  }

  /**
   * Replace state from a full bracket snapshot.
   * @param {object} next
   */
  function restore(next) {
    if (!next || !Array.isArray(next.rounds)) return
    bracket.value = structuredClone(next)
  }

  function reshuffle() {
    const seeds = shuffleSeeds(bracket.value.seeds)
    bracket.value = buildBracket(seeds)
  }

  /**
   * @param {string} matchId
   * @param {string} winner
   * @returns {{ ok: boolean, error?: string, champion?: string|null }}
   */
  function advance(matchId, winner) {
    try {
      bracket.value = advanceWinner(bracket.value, matchId, winner)
      const rounds = bracket.value.rounds
      const final = rounds.length ? rounds[rounds.length - 1][0] : null
      return { ok: true, champion: final?.winner ?? null }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'No se pudo avanzar al ganador',
      }
    }
  }

  return {
    bracket,
    champion,
    rebuild,
    restore,
    reshuffle,
    advance,
  }
}
