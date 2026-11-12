# BracketForge

![image](https://github.com/user-attachments/assets/3f360c88-07c8-409a-8900-f743837a22f3)

SPA de brackets de **eliminación simple**, inspirada en [Challonge](https://challonge.com/es/tournaments/bracket_generator.html). Hecha con Vue 3, Vite, Vue Router y Tailwind CSS. Toasts con Vue Sonner.

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

1. Formulario de configuración (tipo, nombre, formato, participantes) con relleno rápido.
2. Vista de competición con bracket SVG:
   - Clic en un slot para avanzar o corregir ganador
   - Reordenar semillas / actualizar jugadores (con confirmación)
   - Pan/zoom, exportar PNG e imprimir
   - Compartir enlace con el estado comprimido en la URL
3. Persistencia en `localStorage` (`cbg:v1`) de configuración + bracket + vista.
4. Tour de ayuda (`?`) y panel didáctico de conceptos Vue (botón `</>`).
5. Rutas: `/` configuración, `/competition` bracket.

## Docs

- [Índice de features](docs/features/README.md)
- [Plan de formatos futuros](docs/features/tournament-formats.md) (diseño; sin motores aún)

## Ideas futuras

- Motores de Doble eliminación, Round Robin, Suizo y FFA (ver docs)
- Historial de cambios
- IDs cortos en backend para compartir
