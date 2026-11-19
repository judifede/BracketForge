/**
 * Contrato común de los motores de formato de torneo.
 *
 * Todos los motores son funciones puras sobre datos planos (sin Vue, sin DOM),
 * de modo que se pueden testear en el entorno `node` de Vitest.
 *
 * @typedef {'e'|'d'|'r'|'s'} FormatId
 *   `e` eliminación simple · `d` doble eliminación · `r` round robin ·
 *   `s` suisse.
 */

/**
 * Contexto de serialización: el padrón de participantes en su orden original
 * y las opciones del formato. Los motores codifican resultados por **índice**
 * en el padrón, no por nombre, para que los enlaces compartidos sean cortos.
 *
 * @typedef {Object} EngineContext
 * @property {string[]} players
 * @property {Object} [options] Opciones del formato (p. ej. `doubleRound`).
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} [winner] Ganador del partido (formatos 1v1).
 */

/**
 * Motor de un formato de torneo.
 *
 * @typedef {Object} FormatEngine
 * @property {string} id
 * @property {(players: string[], options?: Object) => Object} create
 *   Crea el estado inicial de un torneo sin resultados.
 * @property {(state: Object) => Object} cloneState
 *   Copia profunda del estado (debe tolerar proxies reactivos de Vue).
 * @property {(state: Object, matchId: string, result: MatchResult) => Object} applyResult
 *   Aplica o cambia un resultado. PURA: devuelve un estado nuevo, no muta la entrada.
 * @property {(state: Object, matchId: string, player: string|null) => boolean} canPick
 *   ¿Se puede seleccionar este participante en este partido?
 * @property {(state: Object) => string|null} getChampion
 * @property {(state: Object) => string[]} getRoster
 *   Participantes del torneo en su orden actual (semillas).
 * @property {(state: Object) => { played: number, total: number, complete: boolean }} getProgress
 * @property {(state: Object) => Object} reorder
 *   Reordena participantes / reinicia resultados según la semántica del formato.
 * @property {(state: Object) => boolean} validateState
 *   ¿El estado es válido (para validar snapshots)?
 * @property {(state: Object, ctx: EngineContext) => unknown} encode
 *   Estado → payload compacto para enlaces compartidos.
 * @property {(payload: unknown, ctx: EngineContext) => Object|null} decode
 *   Payload → estado. `null` si el payload no es válido.
 * @property {(players: string[], options?: Object) => { ok: boolean, error: string|null }} validateSetup
 *   Valida participantes y opciones antes de crear el torneo.
 */

/**
 * Entrada del registro de formatos.
 *
 * @typedef {Object} FormatEntry
 * @property {FormatId} id
 * @property {string} label Etiqueta en español para la UI.
 * @property {string} [description] Texto corto que explica el formato en la UI.
 * @property {string[]} legacyLabels Etiquetas históricas (español e inglés) que
 *   deben seguir resolviéndose al leer snapshots y enlaces antiguos.
 * @property {boolean} implemented ¿Hay motor y vista listos para usarse?
 * @property {number} minPlayers Mínimo de participantes admitido por el formato.
 * @property {Object} defaultOptions Opciones por defecto del formato.
 * @property {Array<{
 *   key: string,
 *   type: 'boolean'|'number',
 *   label: string,
 *   hint?: string,
 *   min?: number,
 *   max?: number,
 * }>} optionSchema Opciones que el setup debe ofrecer para este formato.
 * @property {string} [reorderLabel] Etiqueta del botón de reordenación.
 * @property {string} [reorderMessage] Texto de confirmación del reordenado.
 * @property {FormatEngine} engine
 * @property {string} view Clave de la vista (componente) en el dispensador.
 */

export {}
