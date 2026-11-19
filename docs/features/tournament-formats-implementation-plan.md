# Plan de implementación: los formatos pendientes

> **Nota:** el formato FFA (todos contra todos libre) se eliminó del producto. Las secciones
> de este plan que lo mencionan quedan como historial de diseño; el registro activo solo
> incluye eliminación simple, doble eliminación, round robin y suizo.

Plan ejecutable para que **BracketForge** funcione de extremo a extremo con los formatos que hoy
están marcados como *próximamente*:

| Formato | Estado actual | Motor |
| --- | --- | --- |
| Doble eliminación | `disabled` en el setup | `src/lib/formats/doubleElimination.js` |
| Todos contra todos (Round Robin) | `disabled` en el setup | `src/lib/formats/roundRobin.js` |
| Sistema suizo | `disabled` en el setup | `src/lib/formats/swiss.js` |
| FFA (todos contra todos libre) | ❌ Eliminado | — |

El documento de diseño de cada formato está en [tournament-formats.md](./tournament-formats.md).
Este documento baja ese diseño a **tareas, contratos de código y criterios de aceptación**.

## Estado de implementación

| Fase | Estado |
| --- | --- |
| 0 — Cimientos | ✅ Completada |
| 1 — Doble eliminación | ✅ Completada |
| 2 — Round Robin | ✅ Completada |
| 3 — Suizo | ✅ Completada |
| 4 — FFA | ❌ Eliminado del producto |
| 5 — Cierre | ✅ Completada |

**Los formatos activos están eliminación simple, doble eliminación, round robin y suizo.**

### Qué aportó la Fase 0

- `src/lib/formats/` con el registro de formatos, el contrato de motor (JSDoc) y el
  adaptador de eliminación simple.
- `tournamentFormat` pasa a ser **id de formato** (`e`, `d`, `r`, `s`, `f`); las etiquetas
  heredadas (español e inglés) se resuelven en el registro.
- **Snapshot v2** (`{ v, view, competitionData, state }`) con `state = { format, data }`,
  migración desde `cbg:v1` y desde snapshots v1.
- **Enlace compartido v3** con payload opaco por motor; `v1.` y `v2.` siguen decodificándose.
- `useTournament` sustituye a `useBracket`; `Competition.vue` es un dispensador de vistas.
- `BracketViewport.vue` extraído (pan/zoom reutilizable por las vistas de árbol).
- `tournamentOptions` en `competitionData`, validado por `engine.validateSetup`.

### Desviaciones respecto al plan original

| Plan | Implementación | Motivo |
| --- | --- | --- |
| Byes y "rival pendiente" se trataban igual | Cada slot tiene estado `absent` / `pending` / `filled` | Un slot vacío por bye avanza solo; uno vacío porque el rival no ha jugado **espera**. Confundirlos hacía avanzar jugadores antes de tiempo. |
| El estado persistido incluía las estructuras derivadas | Se persisten sólo `seeds`, `results` y `options` | Coherente con §2.1: los resultados son la verdad y el resto se deriva. |
| FFA: reparto en zigzag | Reparto secuencial (4, 4, 2 con 10 participantes) | El criterio de aceptación del plan fijaba heats de 4, 4, 2. |
| FFA: colocaciones obligatorias en cada heat | Colocaciones parciales (0 = sin asignar) | Permite decidir de uno en uno sin tener que completar el heat entero. |
| Round robin: campeón = primero de la tabla | Campeón sólo cuando la liga está completa | Evita el toast "¡X es el campeón!" con la tabla vacía. |
| Suizo: bye para el mejor clasificado sin bye previo | Igual, pero el bye se asigna **antes** de emparejar | Evita que el mismo jugador descanse en todas las rondas de un campo impar. |

### Límite conocido

En el sistema suizo, con campos pequeños y muchos empates, los grupos de puntuación se
fragmentan y **no siempre existe un emparejamiento sin repetir rivales**. El motor busca con
backtracking, repara localmente y, si la revancha es inevitable, la **detecta y la avisa** en
la interfaz (ver §7.3.1).

### Defectos encontrados durante la revisión

Detectados al final de la implementación (navegador + fuzz + tests de componente), ya corregidos:

1. **Descansos repetidos en el sativa** — el mismo jugador recibía el descanso en todas las rondas
   con campo impar. Ahora el descanso se cede al mejor clasificado que aún no lo ha tenido,
   y el estado guarda `byes` para poder deshacerlo.
2. **El formato se reseteaba al aplicar un preset** — elegir "Todos contra todos" y luego pulsar
   un tema volvía a "Eliminación simple". Los presets ya no tocan el formato elegido.
3. **Campeón prematuro en FFA** — se anunciaba campeón antes de jugar el heat final.
4. **Bloque de perdedores solapado con el de ganadores** — la altura del bloque se calculaba con
   la última columna (centrada) en vez de con todas.
5. **Zona temporal muerta en el setup** — `appliedFormatId` se usaba antes de declararse y
   rompía la vista de configuración al volver de un torneo.
6. **Jugadores que se perdían en el suits** — al absorber un flotante, el miembro peor del grupo
   se descartaba en vez de flotar. Ahora los flotantes descienden en cascada.

### Añadidos tras el plan

- **Aviso de enlace largo** (§4.3): si el enlace supera 8 000 caracteres se avisa al compartir.
- **Jornadas plegables** en la vista de round robin.
- **Sonneborn-Berger** como desempate adicional del suits (tras Buchholz).
- **Tests de componente** (`happy-dom`) para el formulario de configuración y el dispensador de
  vistas: son los que cazan los defectos 2 y 5.

---

## 1. Diagnóstico: por qué no basta con "añadir 4 motores"

Hoy el proyecto tiene **un solo motor**, y tres capas del código están acopladas a él:

| Capa | Archivo | Acoplamiento con eliminación simple |
| --- | --- | --- |
| Motor | `src/lib/bracket.js` | — (es el motor) |
| Layout SVG | `src/lib/bracketLayout.js` | Árbol binario: `rounds[r][m]`, conectores padre→hijo |
| Estado reactivo | `src/composables/useBracket.js` | Campeón = `rounds[last][0].winner`; `advance(matchId, winner)` |
| Persistencia | `src/lib/sessionSnapshot.js` | Estado = **orden de semillas + lista plana de ganadores** (`collectContestedWinners` / `rebuildBracketFromWinners`) |
| Vista | `src/components/Brackets.vue` | SVG con 2 slots por partido; clic = elegir ganador |
| Setup | `src/components/Init/Form.vue` | `<option value="Doble eliminación" disabled>` |

Cuatro bloqueos reales, de mayor a menor impacto:

### 1.1 El formato de estado compartido no puede representar los otros formatos

`sessionSnapshot.js` codifica el estado como una **lista plana de ganadores en orden de ronda**
(`src/lib/sessionSnapshot.js:264` y `src/lib/sessionSnapshot.js:342`). Es una codificación
perfectamente válida para eliminación simple, pero:

- **Doble eliminación**: no hay una lista plana equivalente; hay dos árboles (WB/LB), la
  *segunda* derrota y una gran final.
- **Round Robin / Suizo**: el resultado no es un ganador, es un **marcador** (3-1, 0-0). El
  modelo actual solo guarda ganador, así que un empate es indistinguible de "sin jugar".
- **Suizo**: además hay que persistir el **historial de emparejamientos** para que la ronda N+1
  no repita rivales, y qué ronda se ha generado.
- **FFA**: el resultado es una **colocación por heat** (1..N dentro de cada heat), no un ganador.

Sin tocar esto, los 4 formatos funcionarían en pantalla pero **se perderían al recargar o al
compartir enlace** — es decir, no funcionarían.

### 1.2 El modelo de interacción no cubre marcadores ni colocaciones

`advanceWinner(bracket, matchId, winner)` (`src/lib/bracket.js:162`) y el clic en un slot
(`src/components/Brackets.vue:563`) resuelven "elegir ganador". Round Robin y Suizo necesitan
**editar dos marcadores**; FFA necesita **asignar colocaciones** dentro de un heat. Son tres
modelos de interacción distintos → tres vistas nuevas.

### 1.3 El layout es un árbol binario y no se generaliza

`computeBracketLayout` (`src/lib/bracketLayout.js:115`) coloca rondas en columnas y dibuja
conectores ortogonales padre→hijo. Sirve para SE y (parcialmente) para WB. **No** sirve para
Round Robin / Suizo / FFA, que son tablas y tarjetas, no árboles.

### 1.4 El setup no tiene sitio para las opciones por formato

`src/components/Init/Form.vue:46-57` es un `<select>` plano. Round Robin necesita "doble vuelta"
y nº de rondas; Suizo necesita nº de rondas; FFA necesita tamaño de heat y cuántos avanzan.
`competitionData` sólo tiene `tournamentName`, `tournamentFormat`, `tournamentPlayers`.

### 1.5 Detalle menor: el formato se guarda como etiqueta en español

`FORMAT_TO_CODE` (`src/lib/sessionSnapshot.js:13`) solo conoce `'Eliminación simple' → 'e'`, y
`migrateFormat` (`src/components/Init/Form.vue:177`) ya traduce los nombres en inglés heredados.
Cada formato nuevo necesita un **código estable** (`e`, `d`, `r`, `s`, `f`), no una etiqueta
localizable.

---

## 2. Arquitectura objetivo

### 2.1 Principio rector: *resultados son la verdad, el estado es derivado*

En lugar de "avanzar el estado partido a partido" (mutación incremental), cada motor nuevo guarda
únicamente **los resultados introducidos por el usuario** y **deriva** el resto (estructura de
rondas, clasificación, campeón) con funciones puras.

```
results = { [matchId]: resultado }        ← única fuente de verdad (persistida)
   ↓ derive()
state = { estructura, clasificación, campeón }   ← derivado, recalculable
```

Consecuencias directas:

- **Corregir un resultado a mitad de torneo** deja de ser un problema: se cambia el resultado y se
  recalcula. En doble eliminación, un resultado mal puesto en WB invalida *dos* ramas (WB y LB);
  con derivación no hay que escribir la cascada de borrados a mano.
- **Serializar para compartir** es trivial: se serializan solo los resultados (compactos).
- **Testeable**: cada motor es un conjunto de funciones puras sin Vue ni DOM → se testea en el
  entorno `node` que ya usa Vitest (`vite.config.js`).

El motor de eliminación simple **no se reescribe** (funciona y está testeado); se adapta tras
este contrato. Los 4 motores nuevos sí se construyen con el modelo derivado.

### 2.2 Registro de formatos

Nuevo directorio `src/lib/formats/` con un registro único que usan la app, el setup, la
persistencia y el tour:

```
src/lib/formats/
  index.js               # FORMATS, getFormat(id), getFormatByLabel(label), isKnownFormat(id)
  types.js               # typedefs JSDoc del contrato de motor
  singleElimination.js   # adaptador sobre src/lib/bracket.js (sin tocar bracket.js)
  doubleElimination.js
  roundRobin.js
  swiss.js
  ffa.js
  standings.js           # cálculo de clasificación compartido (RR y Suizo)
  schedule.js            # método del círculo (RR) + emparejamiento suizo
```

Cada entrada del registro:

```js
{
  id: 'd',                    // código estable (persistencia, URL, snapshot)
  label: 'Doble eliminación', // etiqueta en español (UI)
  legacyLabels: ['Double Elimination', 'Doble eliminación'],
  minPlayers: 2,
  defaultOptions: {},
  engine: doubleElimination,  // ver contrato 2.3
  view: 'double-elimination', // componente de vista (ver 6)
}
```

`src/lib/formats/index.js` es el **único** sitio donde se registra un formato. Añadir un formato
= añadir una entrada + un motor + una vista. Nada más hay que tocar "en varios sitios".

### 2.3 Contrato de motor

Todo motor implementa esta interfaz (JSDoc en `src/lib/formats/types.js`):

```js
/**
 * @typedef {Object} FormatEngine
 * @property {string} id
 * @property {(players: string[], options: object) => object} create
 *   Crea el estado inicial (sin resultados).
 * @property {(state: object, matchId: string, result: object) => object} applyResult
 *   Aplica/cambia un resultado. PURA: devuelve un estado nuevo, no muta la entrada.
 * @property {(state: object, matchId: string, player: string|null) => boolean} canPick
 *   ¿Se puede seleccionar este jugador en este partido? (para el clic-a-ganador)
 * @property {(state: object) => string|null} getChampion
 * @property {(state: object) => { played: number, total: number, complete: boolean }} getProgress
 * @property {(state: object) => unknown} encode
 *   Estado → payload compacto (JSON plano, sin nombres de jugador si es posible).
 * @property {(payload: unknown) => object|null} decode
 *   Payload → estado. null si el payload no es válido.
 * @property {(players: string[], options: object) => { ok: boolean, error: string|null }} validateSetup
 */
```

`applyResult` es el sustituto genérico de `advanceWinner`. Para SE, el adaptador lo implementa
llamando a `advanceWinner`; para el resto, llamará a la lógica de cada motor.

### 2.4 Formato de identificadores de partido

Cada motor usa ids estables y derivables (necesarios para serializar sin guardar el estado
completo):

| Formato | Patrón | Ejemplos |
| --- | --- | --- |
| SE | `r{ronda}-m{índice}` | `r0-m0` (ya existente, no cambiar) |
| DE | `wb-r{r}-m{m}`, `lb-r{r}-m{m}`, `gf-m{m}` | `wb-r0-m0`, `lb-r2-m0`, `gf-m0` |
| Round Robin | `rr-r{r}-m{m}` | `rr-r3-m1` |
| Suizo | `sw-r{r}-m{m}` | `sw-r2-m0` |
| FFA | `ffa-h{heat}` | `ffa-h3` |

---

## 3. Estados por formato

### 3.1 Eliminación simple (se mantiene)

```js
{ seeds: string[], rounds: Match[][] }   // sin cambios
```

### 3.2 Doble eliminación

```js
{
  seeds: string[],
  winners: { rounds: Match[][] },       // bracket de ganadores (misma estructura que SE)
  losers:  { rounds: Match[][] },       // bracket de perdedores
  grandFinal: { matches: Match[] },     // 1 partido (campeón WB vs campeón LB)
  results: { [matchId]: { winner: string } },   // ← verdad
  options: {}
}
```

Cada `Match` en DE necesita además `loser` (derivado) porque un perdedor de WB **cae** a un slot
concreto del LB, y un perdedor de LB queda eliminado.

### 3.3 Round Robin

```js
{
  players: string[],
  rounds: Array<Array<{ id, p1, p2, p1Score, p2Score, played }>>,
  results: { [matchId]: { a: number, b: number } },
  options: { doubleRound: boolean, pointsWin: number, pointsDraw: number }
}
```

### 3.4 Suizo

```js
{
  players: string[],
  rounds: Array<{ id, index, matches: Array<{ id, p1, p2, p1Score, p2Score, played }> }>,
  results: { [matchId]: { a: number, b: number } },
  history: Array<[string, string]>,   // pares ya enfrentados (para no repetir rivales)
  options: { totalRounds: number, pointsWin: number, pointsDraw: number }
}
```

### 3.5 FFA

```js
{
  entrants: string[],
  heats: Array<{ id, index, entries: Array<{ player, placement }>, completed: boolean }>,
  final: { id, entries: Array<{ player, placement }>, completed: boolean } | null,
  results: { [heatId]: { placements: { [player]: number } } },
  options: { heatSize: number, advancePerHeat: number, hasFinal: boolean }
}
```

---

## 4. Persistencia y enlaces compartidos (bloqueante)

### 4.1 Snapshot local

- `SNAPSHOT_VERSION` 1 → **2**.
- Nuevo shape: `{ v: 2, view, competitionData, state }` donde
  `state = { format: 'e'|'d'|'r'|'s'|'f', data: <estado del motor> }`.
- **Migración**: al leer un snapshot v1, si trae `bracket`, se convierte a
  `{ format: 'e', data: { seeds, rounds } }`. Un bracket v1 no se pierde.
- `STORAGE_KEY` `cbg:v1` → `cbg:v2`, leyendo `cbg:v1` como fallback y migrándolo.

### 4.2 Enlace compartido

- Nueva versión compacta **v3**: `{ v: 3, view, n, f, p, x }` donde `x` es el payload opaco del
  motor (`engine.encode(state)`). `f` = código de formato.
- Los enlaces `v1.` y `v2.` **siguen decodificándose** (compatibilidad con enlaces ya
  compartidos): `decodeSharePayload` mantiene las ramas actuales y añade `v3.`.
- Se **elimina** la codificación "semillas + ganadores" del camino v3: pasa a ser responsabilidad
  del motor SE (`singleElimination.encode` reproduce exactamente el formato actual, para no
  alargar los enlaces existentes).

### 4.3 Tamaño del enlace

Round Robin con 16 participantes son 120 partidos; codificados como ternas
`[índicePartido, golA, golB]` y comprimidos con LZString, el enlace ronda los ~600–900
caracteres. Aceptable para navegadores modernos, pero:

- El **enlace corto de Firestore** (`src/lib/shortShare.js`) debe ser el camino **preferente**
  para formatos con muchos partidos (ya existe la infraestructura: `createShareUrl`).
- Si no hay Firebase configurado y el payload supera un umbral (p. ej. 8 000 chars), mostrar un
  aviso: "enlace largo, puede que no quepa en algunos sitios".

### 4.4 `tournamentFormat` pasa a ser código

`competitionData.tournamentFormat` guarda el **id** (`'e'`, `'d'`, `'r'`, `'s'`, `'f'`), no la
etiqueta. La etiqueta sale del registro (`getFormat(id).label`).
`migrateFormat` (`src/components/Init/Form.vue:177`) y el `CODE_TO_FORMAT` actual se sustituyen por
la tabla del registro, que ya incluye los nombres heredados en inglés.

Nuevo campo opcional `competitionData.tournamentOptions` con las opciones del formato.

---

## 5. Setup: opciones por formato

En `src/components/Init/Form.vue`:

1. Se **habilitan** las 4 opciones del `<select>` (una a una, según su motor esté listo).
2. Se añade un bloque **condicional** de opciones que aparece según el formato elegido:

| Formato | Opción | Tipo | Por defecto |
| --- | --- | --- | --- |
| Round Robin | Doble vuelta | checkbox | No |
| Round Robin | Puntos por victoria / empate | number | 3 / 1 |
| Suizo | Número de rondas | number | `min(3, floor(log2(n)))` |
| Suizo | Puntos por victoria / empate | number | 3 / 1 |
| FFA | Tamaño del heat | number | 4 |
| FFA | Avanzan por heat | number | 2 |
| FFA | Heat final | checkbox | Sí |

3. El botón pasa de "Crear bracket" a **"Crear torneo"** (deja de ser un termino específico).
4. `validateCompetitionForm` (`src/utils/formValidation.js`) pasa a validar con
   `engine.validateSetup(players, options)` en vez del `min: 2` genérico. Mínimos reales:
   - SE: 2, DE: 2 (pero con 2 la LB es trivial → avisa), RR: 2 (con 2 es un solo partido),
     Suizo: 4 (si no, no hay emparejamiento con adversario), FFA: ≥ `heatSize`.
5. Los **presets** (`src/data/formPresets.js`) pasan a poder generar cada formato: el botón
   "Sorpresa" elige formato + tamaño, y los tamaños dejan de ser sólo potencias de 2
   (`SIZES = [4, 8, 16]`) porque RR y Suizo funcionan bien con 5, 7, 12…

---

## 6. Vistas por formato

### 6.1 Dispensador

`src/components/Competition.vue` pasa a ser un **dispensador**: lee
`competitionData.tournamentFormat`, resuelve el componente desde el registro y renderiza
`<component :is="viewComponent" ... />`.

La barra de herramientas se mantiene (Volver / Formato / Campeón / Reordenar / Actualizar /
Compartir), pero **"Reordenar" cambia de significado** según el formato:

| Formato | "Reordenar" hace |
| --- | --- |
| SE | Baraja semillas (actual) |
| DE | Baraja semillas (reinicia WB y LB) |
| Round Robin | Reinicia **resultados** (conserva el calendario) |
| Suizo | Reinicia el torneo (borra rondas e historial) |
| FFA | Re-sortea los heats y reinicia resultados |

### 6.2 Componentes

| Formato | Componente | Render |
| --- | --- | --- |
| SE | `src/components/Brackets.vue` (existente, **sin tocar**) | Árbol SVG |
| DE | `src/components/formats/DoubleEliminationView.vue` | Dos árboles SVG apilados (WB arriba, LB abajo) + gran final |
| RR | `src/components/formats/RoundRobinView.vue` | Tabla de clasificación + partidos por ronda (HTML, sin SVG) |
| Suizo | `src/components/formats/SwissView.vue` | Tabla de clasificación + ronda actual + navegación de rondas |
| FFA | `src/components/formats/FfaView.vue` | Tarjetas de heat con select de colocación + resumen de avances |

### 6.3 Extracción del viewport

`src/components/Brackets.vue` mezcla tres responsabilidades: viewport (scroll/pan/zoom), render
SVG y lógica de slots. Para que DE reutilice el pan/zoom se extrae:

- `src/components/BracketViewport.vue` — scroll, pan, zoom, indicador de desborde, slot por
  defecto con el SVG dentro. Parámetros: `width`, `height`.
- `Brackets.vue` pasa a usar `BracketViewport` envuelto en su SVG actual (**cambio mecánico, sin
  cambio de comportamiento**).
- `DoubleEliminationView.vue` usa el mismo viewport con un SVG de doble árbol.

### 6.4 Layout de doble eliminación

Nuevo `src/lib/layout/doubleEliminationLayout.js`:

- Calcula la geometría de **dos bloques** (WB y LB) apilados verticalmente, cada uno con su
  rejilla de rondas.
- La LB tiene ~2x las rondas de la WB y la mitad de ancho; se dibuja en horizontal (columnas =
  rondas) alineada al lado izquierdo, con la gran final a la derecha, al estilo Challonge.
- `computeBracketLayout` (SE) **se queda como está** para no arriesgar regresiones.

### 6.5 Componentes de entrada compartidos

Dos inputs reutilizables, porque RR y Suizo comparten el modelo "marcador":

- `src/components/formats/ScoreInput.vue` — dos campos numéricos + validación (enteros ≥ 0).
- `src/components/formats/StandingsTable.vue` — tabla de clasificación reutilizable
  (columnas configurables: JJ, G, E, P, GF, GC, Dif, Pts / Buchholz).

---

## 7. Reglas de torneo por formato

### 7.1 Doble eliminación

**Estructura**

- Tamaño del cuadro `M` = siguiente potencia de dos ≥ nº de participantes (mínimo 4 para que la
  LB tenga sentido; con 2 el motor avisa y aplica el caso trivial).
- **WB**: igual que SE (reutiliza `buildBracket` con byes automáticos), pero se registra el
  **perdedor** de cada partido.
- **LB**: `2(k-1)` rondas, donde `M = 2^k`. Para `M = 8` → 4 rondas con 2, 2, 1, 1 partidos
  (6 partidos en total; con WB de 7 y GF de 1 → 14 = `2·N − 2` ✓).

**Reglas de emparejamiento de la LB** (derivadas, no cableadas a mano). Con `ℓ` = ronda de LB:

| Ronda LB | Partido `m` | Entrada 1 | Entrada 2 |
| --- | --- | --- | --- |
| `ℓ = 1` | `m` | perdedor de WB r1 partido `2m` | perdedor de WB r1 partido `2m+1` |
| `ℓ` par (`2j`) | `m` | ganador de LB ronda `ℓ−1` partido `m` | perdedor de WB ronda `j+1` partido `m` |
| `ℓ` impar (>1) | `m` | ganador de LB ronda `ℓ−1` partido `2m` | ganador de LB ronda `ℓ−1` partido `2m+1` |

Comprobado para `M = 8` (LB: L1 → L2 → L3 → L4, con L4 = ganador de L3 vs perdedor de la final
de WB) y para `M = 16` (LB: 4, 4, 2, 2, 1, 1 partidos).

**Byes**

- Un partido de WB con un solo participante genera **ganador automático** y **ningún perdedor**.
- Un partido de WB con dos byes (ambos lados vacíos) no genera nada.
- Un slot de LB cuyo alimentador no produjo jugador queda **vacío**; el partido de LB con un solo
  participante avanza automáticamente y **no genera perdedor**; con dos vacíos se salta.
- Esto es el punto más delicado del formato: **obligatorio cubrirlo con tests explícitos**.

**Eliminación**

- 1ª derrota → el jugador cae a la LB.
- 2ª derrota → eliminado. En la LB, el perdedor de cada partido queda eliminado (el perdedor de la
  final de LB queda eliminado; el campeón de WB nunca pierde en LB).

**Gran final**

- WB campeón vs LB campeón en **una sola** partida: el ganador es el campeón del torneo.
- Opciones legacy como `resetGrandFinal` en estados compartidos antiguos se ignoran.

**Corrección de resultados**

Al cambiar un resultado de WB se recalcula: WB por delante, la rama de LB alimentada por ese
partido, y la gran final. Al cambiar un resultado de LB se recalcula LB y GF. **En ningún caso se
deja un resultado huérfano.** Esto es directo de §2.1.

### 7.2 Round Robin

- Todos contra todos, **una vuelta** por defecto; `doubleRound` juega cada pareja dos veces
  (2 partidos, local/visitante intercambiados).
- Nº de partidos: `n(n−1)/2` (o `n(n−1)` en doble vuelta).
- **Calendario** por método del círculo: `n−1` jornadas (`n` si `n` es impar, con un descanso por
  jornada). Un equipo fijo, el resto rota.
- Marcadores: dos enteros ≥ 0 por partido; empate permitido.
- **Clasificación**: JJ, G, E, P, GF, GC, Dif, Pts (3/1/0 por defecto, configurable).
- **Desempates**, en este orden: Pts → Diferencia → Goles a favor → **head-to-head** entre los
  empatados (puntos en la sub-tabla) → orden alfabético (desempate determinista, siempre).
- Campeón = primero de la tabla. Si el desempate final es alfabético, la interfaz lo indica
  ("desempate por orden alfabético").
- Vista: tabla arriba (fija), partidos por jornada debajo. Las jornadas se pueden plegar.

### 7.3 Sistema suizo

- Nº de rondas configurable (por defecto `min(3, floor(log2(n)))`; máximo recomendado `floor(log2(n))`).
- **Emparejamiento** (implementado en `src/lib/formats/swiss.js`):
  1. Si el número de participantes es impar, **uno recibe descanso**: el mejor clasificado que
     aún no lo haya tenido (el estado guarda `byes` para no repetirlo y poder deshacerlo).
  2. El resto se agrupa por puntuación (grupos de mayor a menor).
  3. Dentro de cada grupo se busca un emparejamiento **sin revanchas** mediante emparejamiento
     bipartito máximo (mitad alta contra mitad baja del grupo).
  4. Si un grupo tiene un número impar, uno "flota" (downfloat) al grupo inferior; si el flotante
     tampoco puede emparejarse, la cascada continúa hasta encontrar hueco.
  5. Antes de aceptar la ronda se ejecuta una **búsqueda con backtracking** sobre toda la ronda
     (con presupuesto de nodos) que busca una solución sin revanchas; si la encuentra, se usa.
  6. Si aun así no hay solución posible (grupos demasiado fragmentados), se usa el emparejamiento
     greedy y **la ronda marca la revancha**, que la interfaz muestra como aviso.
- **Clasificación**: Pts, Buchholz (suma de puntos de rivales), y opcionalmente
  Sonneborn-Berger. Los empates en la tabla se ordenan por Buchholz.
- **Acciones**:
  - "Generar ronda" — habilitada sólo cuando la ronda actual está completa; genera la ronda
    siguiente y **añade los emparejamientos al historial**.
  - "Deshacer ronda" — borra la última ronda generada y sus resultados, y deshace el historial.
  - Marcadores por partido (mismo componente que RR).
- Las rondas generadas pero no jugadas **se persisten** (el historial de rivales es parte del
  estado) — de ahí la importancia de `history` en el modelo.

### 7.3.1 Limitación conocida: revanchas

Con campos pequeños y muchos empates, los grupos de puntuación se fragmentan (muchos grupos de
una sola persona) y **no siempre existe un emparejamiento sin repetir**. El motor hace lo
posible: busca con backtracking, repara localmente y, si aun así la revancha es inevitable, la
**detecta y la muestra como aviso** en la ronda. El criterio de aceptación del plan (16
participantes y 4 rondas sin repeticiones) se cumple.

### 7.4 FFA

- `heatSize` (por defecto 4) participantes por heat; los participantes se reparten en heats por
  orden de semilla, de forma secuencial (con 10 participantes y heatSize 4: heats de 4, 4 y 2).
- `advancePerHeat` (por defecto 2) clasifican por heat.
- `hasFinal`: si está activo, los clasificados de los heats de clasificación disputan un **heat
  final**; el campeón es el que termina 1º en ese heat (y no existe hasta que se juega).
- Si `hasFinal` está desactivado, el campeón es el mejor clasificado (1er puesto de heat, luego
  2º, etc.).
- El heat final se siembra **por posición**: primero los 1ºs de cada heat, después los 2ºs, etc.
- **Resultado de un heat**: cada participante recibe una **colocación** 1..n, sin repetirse dentro
  del heat. Las colocaciones pueden quedar parciales (`0` = sin asignar) para poder decidir de uno
  en uno; el heat está completo cuando todos tienen colocación.
- Las colocaciones se editan con un `<select>` por participante (nada de free text: evita datos
  sucios y hace la validación trivial). Al elegir una colocación ya usada, el participante que la
  tenía la libera.
- **Vista**: tarjetas de heat (no SVG) con un resumen arriba: cuántos heats hay, cuántos clasifican
  y si falta el heat final.

---

## 8. Fases de implementación

Cada fase termina con `npm run lint && npm test && npm run build` en verde.

### Fase 0 — Cimientos (bloqueante, va primero)

Sin esta fase, los formatos no se pueden guardar ni compartir.

1. `src/lib/formats/types.js` + `src/lib/formats/index.js` (registro, aún solo con `e`).
2. `src/lib/formats/singleElimination.js` — adaptador de `src/lib/bracket.js` al contrato.
3. `tournamentFormat` → id de formato + `tournamentOptions` en `competitionData`; migración de
   etiquetas heredadas en el registro.
4. Snapshot **v2** +State `{ format, data }` y migración desde v1.
5. Enlace compartido **v3** con payload opaco por motor; se mantienen `v1.`/`v2.`.
6. `useTournament` (composables) genérico, sustituyendo `useBracket`; `useBracket` queda como
   wrapper de SE o se elimina al migrar la vista.
7. `Competition.vue` como dispensador (sólo SE por ahora) + `BracketViewport.vue` extraído.
8. Persistencia de `state` en `useSession` (`state` en vez de `bracket`).

**Criterio de aceptación**: un torneo SE existente (localStorage v1 y enlace v2) se abre,
comparte y recarga sin pérdida; el snapshot v2 se valida con `validateSnapshot`.

### Fase 1 — Doble eliminación

1. Motor `doubleElimination.js` (WB + LB + GF) con derivación desde `results`.
2. Layout `doubleEliminationLayout.js` + vista `DoubleEliminationView.vue`.
3. Validación de setup (aviso con < 4 participantes).
4. Tests del motor: estructura con 8 y 16 participantes, byes, gran final única, corrección de
   resultado en WB que invalida la rama de LB, LB con byes encadenados.

**Criterio de aceptación**: con 8 participantes, se puede completar un torneo entero; cambiar un
resultado de la semifinal de WB propaga el cambio a la LB y a la GF; con 6 participantes (2 byes)
el torneo sigue siendo consistente y no hay ningún jugador eliminado con 0 partidas.

### Fase 2 — Round Robin

1. Motor `roundRobin.js` (calendario por círculo + clasificación + desempates).
2. Vista `RoundRobinView.vue` (tabla + jornadas plegables).
3. `ScoreInput.vue` + `StandingsTable.vue` compartidos.
4. Opciones de setup (doble vuelta, puntos).

**Criterio de aceptación**: con 7 participantes, 21 partidos repartidos en 7 jornadas (1 descanso
por jornada); la tabla ordena por puntos, diferencia, GF, head-to-head y alfabético; editar un
marcador actualiza la tabla al instante; el estado sobrevive a recargar y a compartir.

### Fase 3 — Suizo

1. Motor `swiss.js` (emparejamiento con float-down, sin revancha, byes, Buchholz).
2. Vista `SwissView.vue` + acciones "Generar ronda" / "Deshacer ronda".
3. Opciones de setup (nº de rondas).

**Criterio de aceptación**: con 16 participantes y 4 rondas, ninguna pareja se repite; con 15
participantes hay 1 bye por ronda y **nadie recibe dos descansos**; "Generar ronda" sólo se habilita
con la ronda completa; "Deshacer ronda" devuelve el estado exacto anterior.

### Fase 4 — FFA

1. Motor `ffa.js` (reparto en heats, colocaciones, clasificación a heat final).
2. Vista `FfaView.vue` (tarjetas de heat con select de colocación).
3. Opciones de setup (tamaño de heat, avanzan, heat final).

**Criterio de aceptación**: con 10 participantes, heatSize 4 y 2 clasifican → 3 heats (4, 4, 2) y
heat final de 4; las colocaciones duplicadas dentro de un heat se rechazan; el campeón es el 1º
del heat final y **no existe antes de jugarlo**.

### Fase 5 — Cierre

1. Tour de ayuda por formato (`src/lib/tourSteps.js`: hoy sólo distingue setup/competition).
2. Actualizar `docs/features/README.md`, `README.md` y `docs/features/tournament-formats.md`.
3. Revisar textos: "Crear bracket" → "Crear torneo"; el popover del tour que dice *"Hoy está
   disponible Eliminación simple. Otros formatos están documentados como próximos."*
   (`src/lib/tourSteps.js:32`) queda obsoleto.
4. Banner en la app indicando el formato activo (ya hay `toolbar-format` en
   `src/components/Competition.vue:25`).

---

## 9. Estrategia de tests

Vitest corre en entorno `node` (`vite.config.js`), así que **los motores se testean sin DOM**:
toda la lógica debe vivir en `src/lib/formats/*.js` y no en los `.vue`.

Tests por motor (tabla-driven, con semilla determinista):

| Suite | Qué cubre |
| --- | --- |
| Estructura | Nº de rondas/partidos, calendario, reparto de seeds |
| Progresión | Partida a partida hasta el campeón, sin resultados huérfanos |
| Corrección | Cambiar un resultado a mitad → estado coherente (resultado derivado) |
| Byes | N no potencia de dos, en SE, DE y Suizo |
| Reglas | Empates, desempates, sin revancha, colocaciones únicas (FFA) |
| Round-trip | `decode(encode(state))` produce un estado equivalente al original |
| Determinismo | Con la misma semilla, dos ejecuciones dan el mismo resultado |

Componentes: `@vue/test-utils` está instalado pero **no se usa** (`happy-dom` tampoco está
configurado). Se recomienda mantener la lógica en los motores y testear ahí; si hace falta un test
de componente, se añade `// @vitest-environment happy-dom` **sólo** en ese fichero, sin cambiar el
entorno global.

---

## 10. Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| R1 | El enlace compartido se rompe al cambiar el formato del snapshot | Alto | Migración explícita v1→v2 y lectura de `v1.`/`v2.` conservada; tests de fixtures antiguos |
| R2 | Byes encadenados en la LB de doble eliminación | Alto | Derivación desde `results` + suite de tests dedicada (§7.1) |
| R3 | Round Robin con muchos participantes → enlace enorme | Medio | Enlace corto de Firestore preferente; aviso si el hash supera ~8 000 chars |
| R4 | Reordenar tiene 4 significados distintos y confunde | Medio | Etiqueta del botón dinámica según formato + confirmación explícita |
| R5 | `useSession` es un singleton y `bracket` se usa en 4 sitios | Medio | Renombrar a `state` en la Fase 0, de golpe, antes de añadir formatos |
| R6 | Reglas de emparejamiento con criterios ambiguos | Medio | Reglas fijadas en §7.3 y tests que las fijan como contrato |
| R7 | Regresión en SE al tocar la base compartida | Alto | SE **no se toca**; adaptador encima. `Brackets.vue` sólo se extrae el viewport |
| R8 | Deriva entre `docs/features/README.md` y el estado real | Bajo | Actualizar los docs en la Fase 5 y en cada fase |

---

## 11. Esfuerzo estimado

Unidad ≈ un día de trabajo enfocado (con tests incluidos).

| Fase | Esfuerzo |
| --- | --- |
| 0 — Cimientos | 4–5 u. |
| 1 — Doble eliminación | 4–5 u. |
| 2 — Round Robin | 3 u. |
| 3 — Suizo | 3–4 u. |
| 4 — FFA | 2–3 u. |
| 5 — Cierre | 1–2 u. |
| **Total** | **17–22 u.** |

El orden no es por dificultad, sino por **reutilización**: doble eliminación reutiliza el motor de
WB y el layout SVG; Round Robin y Suizo comparten `ScoreInput` + `StandingsTable` + `standings.js`;
FFA reutiliza la persistencia pero necesita su propio modelo de resultado.

---

## 12. Fuera de alcance

- Formatos con grupos (fase de grupos + eliminatorias), tercer puesto, etc.
- Partidos en vivo (streaming de resultados) — "doble vuelta" sí se considera, dentro de Round Robin.
- Persistencia en backend más allá del enlace corto de Firestore ya existente.
- Cuentas de usuario / perfiles.
- Exportar a PDF o PNG.
