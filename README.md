# BracketForge

![image](https://github.com/user-attachments/assets/3f360c88-07c8-409a-8900-f743837a22f3)

SPA de brackets de torneo, inspirada en [Challonge](https://challonge.com/es/tournaments/bracket_generator.html). Hecha con Vue 3, Vite, Vue Router y Tailwind CSS. Toasts con Vue Sonner.

Cuatro formatos: eliminación simple, doble eliminación, todos contra todos y sistema suizo.

## Setup

```bash
npm install
npm run dev
```

Servidor de desarrollo en [http://localhost:4000](http://localhost:4000).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` / `npm start` | Vite en el puerto **4000** |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | ESLint (Vue + JS) |
| `npm test` | Tests unitarios con Vitest |

## Features

1. Formulario de configuración (nombre, formato con sus opciones, participantes) con relleno rápido.
2. Vista de competición según el formato:
   - **Eliminación simple** y **doble eliminación**: bracket SVG con clic en un slot para
     avanzar o corregir ganador, pan/zoom y bracket de perdedores + gran final.
   - **Round robin** y **suizo**: tabla de clasificación + jornadas con marcadores.
   - Reordenar / actualizar participantes / compartir (todos con confirmación cuando toca).
3. Persistencia en `localStorage` (`cbg:v2`) de configuración + estado del torneo + vista.
4. Tour de ayuda (`?`) y panel didáctico de conceptos Vue (botón `</>`).
5. Rutas: `/` configuración, `/competition` torneo.

### Arquitectura de formatos

Los formatos de torneo viven detrás de un registro (`src/lib/formats/index.js`) con un
contrato de motor común (`create`, `applyResult`, `getChampion`, `encode`/`decode`,
`validateSetup`). La persistencia guarda el estado como `{ format, data }` y cada motor
codifica su propio payload para los enlaces compartidos.

- **Snapshot v2** en `localStorage` (migra automáticamente desde `cbg:v1`).
- **Enlaces v3** (`#s=v3.…`); los enlaces `v1.` y `v2.` existentes siguen decodificándose.
- `tournamentFormat` guarda un **id estable** (`e`, `d`, `r`, `s`), no una etiqueta.

## Docs

- [Índice de features](docs/features/README.md)
- [Diseño de los formatos](docs/features/tournament-formats.md)
- [Plan de implementación de los formatos](docs/features/tournament-formats-implementation-plan.md)
  (arquitectura, reglas exactas por formato, fases, riesgos y desviaciones)

## Ideas futuras

- Persistencia en backend más allá del enlace corto de Firestore ya existente.
- Historial de cambios.
- Exportar a PDF o PNG.
