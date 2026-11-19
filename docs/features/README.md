# Features

Índice de documentación de funcionalidades y planes de producto.

## Disponible

Los cuatro formatos de torneo están implementados detrás del mismo contrato de motor:

| Formato | Motor | Vista |
| --- | --- | --- |
| Eliminación simple | `src/lib/formats/singleElimination.js` | `src/components/Brackets.vue` |
| Doble eliminación | `src/lib/formats/doubleElimination.js` | `src/components/formats/DoubleEliminationView.vue` |
| Todos contra todos (Round Robin) | `src/lib/formats/roundRobin.js` | `src/components/formats/RoundRobinView.vue` |
| Sistema suizo | `src/lib/formats/swiss.js` | `src/components/formats/SwissView.vue` |

## Arquitectura de formatos

- `src/lib/formats/index.js` — registro único de formatos (id, etiqueta, opciones, motor, vista).
- `src/lib/formats/types.js` — contrato de motor en JSDoc.
- `src/lib/formats/standings.js` — clasificación compartida (round robin y suizo).

Cualquier formato nuevo = una entrada en el registro + su motor + su vista.

La persistencia guarda el estado como `{ format, data }` y cada motor codifica su propio
payload para los enlaces compartidos:

- **Snapshot v2** en `localStorage` (migra automáticamente desde `cbg:v1`).
- **Enlaces v3** (`#s=v3.…`); los enlaces `v1.` y `v2.` existentes siguen decodificándose.
- `tournamentFormat` guarda un **id estable** (`e`, `d`, `r`, `s`), no una etiqueta.

## Reglas de cada formato

- [Doble eliminación](./tournament-formats.md#doble-eliminación)
- [Todos contra todos](./tournament-formats.md#todos-contra-todos-round-robin)
- [Sistema suizo](./tournament-formats.md#sistema-suizo)

## Plan de trabajo

- [Plan de implementación de los formatos pendientes](./tournament-formats-implementation-plan.md) —
  arquitectura objetivo, contratos de motor, reglas por formato, fases, riesgos y criterios de aceptación.
  **Fases 0–5 completadas.**
