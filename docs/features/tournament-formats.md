# Plan de formatos de torneo

Diseño de los formatos adicionales. **Implementados**: los cuatro formatos de este documento
tienen motor, vista y tests (`src/lib/formats/`).

> Para la ejecución (arquitectura, contratos de motor, reglas exactas por formato, fases y
> criterios de aceptación), ver
> [Plan de implementación de los formatos pendientes](./tournament-formats-implementation-plan.md).


## Eliminación simple (actual)

- Cuadro de potencia de 2 con byes automáticos.
- Clic en slot para avanzar / corregir ganador.
- Persistencia completa + URL compartible con payload comprimido.

---

## Doble eliminación

### Objetivo
Cada participante debe perder **dos veces** para quedar eliminado. Hay bracket de ganadores (WB) y de perdedores (LB); el campeón se define en una sola gran final.

### Modelo de datos (propuesto)
- `brackets.winners`: rondas WB
- `brackets.losers`: rondas LB (más densas; emparejamientos desde WB)
- `grandFinal`: un partido final (campeón WB vs campeón LB)
- Referencias de “drop” desde cada derrota WB hacia un slot LB

### UI
- Dos columnas o pestañas WB / LB, o un layout Challonge-like apilado.
- Destacar el camino del campeón hasta la gran final.

### Riesgos
- Layout mucho más ancho/alto; pan/zoom obligatorio.
- Reglas de bye y re-seeding en LB son fáciles de equivocar.

---

## Todos contra todos (Round Robin)

### Objetivo
Todos juegan contra todos (o en grupos). Clasificación por puntos / diferencia.

### Modelo de datos (propuesto)
- `players[]`
- `matches[]` con `home`, `away`, `score` opcional, `status`
- `standings` derivado (puntos, PJ, PG, PP, dif.)

### UI
- Tabla de clasificación + lista/calendario de partidos.
- Menos énfasis en SVG de árbol; más en tabla editable.

### Riesgos
- Número de partidos crece O(n²); UX de carga de resultados.

---

## Sistema suizo

### Objetivo
Emparejar cada ronda por puntuación similar, sin eliminación directa. Ideal cuando hay muchas entradas y pocas rondas.

### Modelo de datos (propuesto)
- `rounds[]` con emparejamientos generados
- Historial de rivales (evitar repeticiones)
- Float / bye tracking
- `standings` con buchholz u otros desempates (fase 2)

### UI
- Vista por ronda + standings global.
- Acción “Generar siguiente ronda” cuando la actual está cerrada.

### Riesgos
- Algoritmo de pairing (y desempates) necesita reglas claras y tests.

---

## Orden de implementación sugerido

1. Doble eliminación (reutiliza mucho del motor de rondas actual).
2. Round Robin (tabla + standings).
3. Suizo (pairing + rondas).

Cada formato debería:

- Extender `competitionData.tournamentFormat`
- Tener su propio módulo de motor + tests
- Reutilizar persistencia/`sessionSnapshot` con `v` incrementable si el shape cambia
