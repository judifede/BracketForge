import { ref, computed } from 'vue'
import { getFormat } from '../lib/formats/index.js'

/**
 * Estado reactivo de un torneo, agnóstico del formato.
 *
 * Delega toda la lógica en el motor del formato (`src/lib/formats/*`) y expone
 * un contrato uniforme: `state`, `champion`, `progress` y `applyResult`.
 *
 * @param {string} formatId Id de formato (`e`, `d`, `r`, `s`).
 * @param {object|null} [initialState] Estado previo (del motor).
 * @param {string[]} [players] Participantes para crear un torneo nuevo.
 * @param {object} [options] Opciones del formato.
 */
export function useTournament(formatId = 'e', initialState = null, players = [], options = {}) {
  const format = getFormat(formatId) ?? getFormat('e')
  const engine = format.engine

  const state = ref(
    initialState ? engine.cloneState(initialState) : engine.create(players, options)
  )

  const champion = computed(() => engine.getChampion(state.value))

  const progress = computed(() => engine.getProgress(state.value))

  /**
   * @param {string} matchId
   * @param {object} result
   * @returns {{ ok: boolean, error?: string, champion?: string|null }}
   */
  function applyResult(matchId, result) {
    try {
      state.value = engine.applyResult(state.value, matchId, result)
      return { ok: true, champion: champion.value }
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error ? err.message : 'No se pudo aplicar el resultado',
      }
    }
  }

  /**
   * Ejecuta una acción que no es un resultado (generar/deshacer ronda, etc.).
   * @param {object} action
   * @returns {{ ok: boolean, error?: string, champion?: string|null }}
   */
  function applyAction(action) {
    if (typeof engine.applyAction !== 'function') {
      return { ok: false, error: 'Este formato no admite esa acción.' }
    }
    try {
      state.value = engine.applyAction(state.value, action)
      return { ok: true, champion: champion.value }
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error ? err.message : 'No se pudo aplicar la acción',
      }
    }
  }

  /**
   * Crea un torneo nuevo con otra lista de participantes.
   * @param {string[]} nextPlayers
   * @param {object} [nextOptions]
   */
  function rebuild(nextPlayers, nextOptions = options) {
    state.value = engine.create(nextPlayers, nextOptions)
  }

  /**
   * Reordena participantes / reinicia resultados según el formato.
   */
  function reorder() {
    state.value = engine.reorder(state.value)
  }

  /**
   * Sustituye el estado por uno completo (hidratación, deshacer...).
   * @param {object|null} next
   */
  function restore(next) {
    if (!next) return
    state.value = engine.cloneState(next)
  }

  return {
    format,
    engine,
    state,
    champion,
    progress,
    applyResult,
    applyAction,
    rebuild,
    reorder,
    restore,
  }
}
