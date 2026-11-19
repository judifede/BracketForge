import {
  LAYOUT,
  matchHeight,
  winnerPathPoints,
} from './treeLayout.js'

/**
 * Layout del torneo de doble eliminación: bracket de ganadores arriba, bracket de
 * perdedores abajo y gran final a la derecha.
 *
 * A diferencia del bracket simple, el de perdedores NO es un árbol regular:
 * sus alimentadores alternan 1:1 (ganador de la ronda anterior + caída del
 * bracket de ganadores) y 2:1 (dos ganadores de la ronda anterior).
 */

const BLOCK_GAP = 64
const GF_GAP = 32

/**
 * @typedef {Object} DePositionedMatch
 * @property {Object} match
 * @property {number} x
 * @property {number} y
 * @property {number} centerY
 * @property {{ x: number, y: number, width: number, height: number }} frame
 * @property {{ x: number, y: number, width: number, height: number }} slot1
 * @property {{ x: number, y: number, width: number, height: number }} slot2
 */

/**
 * Vertical gap entre partidos de la primera ronda.
 * @param {number} count
 * @returns {number}
 */
function baseStep(count) {
  const mh = matchHeight()
  const minGap = 20
  return mh + Math.max(minGap, 28 - Math.min(count, 8) * 2)
}

/**
 * Vertical exit de un partido: slot del ganador si está decidido, si no el centro.
 * @param {DePositionedMatch} positioned
 * @returns {number}
 */
function exitY(positioned) {
  const { match, centerY, slot1, slot2 } = positioned
  if (match.winner && match.winner === match.p1) {
    return slot1.y + slot1.height / 2
  }
  if (match.winner && match.winner === match.p2) {
    return slot2.y + slot2.height / 2
  }
  return centerY
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
function slot(x, y, width, height) {
  return { x, y, width, height }
}

/**
 * Posiciona los partidos de una columna.
 * @param {number} x
 * @param {Array<DePositionedMatch>} previous Columna anterior (para centrar).
 * @param {Object[]} matches
 * @param {'pair'|'single'|'stack'} feeder Tipo de alimentación desde la columna previa.
 * @returns {DePositionedMatch[]}
 */
function placeColumn(x, previous, matches, feeder) {
  const mh = matchHeight()
  const positioned = []

  for (let m = 0; m < matches.length; m += 1) {
    let y
    if (feeder === 'stack') {
      y = LAYOUT.paddingY + LAYOUT.labelHeight + m * baseStep(matches.length)
    } else if (feeder === 'single') {
      const feederMatch = previous[m]
      y = feederMatch.centerY - mh / 2
    } else {
      const a = previous[m * 2]
      const b = previous[m * 2 + 1]
      y = (a.centerY + b.centerY) / 2 - mh / 2
    }

    const centerY = y + mh / 2
    positioned.push({
      match: matches[m],
      x,
      y,
      centerY,
      frame: slot(x, y, LAYOUT.slotWidth, mh),
      slot1: slot(x, y, LAYOUT.slotWidth, LAYOUT.slotHeight),
      slot2: slot(
        x,
        y + LAYOUT.slotHeight + LAYOUT.matchInnerGap,
        LAYOUT.slotWidth,
        LAYOUT.slotHeight
      ),
    })
  }
  return positioned
}

/**
 * Layout del bracket de perdedores (alimentadores alternos 1:1 / 2:1).
 * @param {Object[][]} loserRounds
 * @returns {{ columns: Array<{ x: number, matches: DePositionedMatch[] }>, width: number, height: number }}
 */
function computeLosersTree(loserRounds) {
  const columns = []
  let previous = []

  for (let l = 0; l < loserRounds.length; l += 1) {
    const x = LAYOUT.paddingX + l * (LAYOUT.slotWidth + LAYOUT.roundGap)
    // ℓ = l + 1 (1-based). Las rondas pares alimentan 1:1 y las impares >1 en 2:1.
    const feeder = l === 0 ? 'stack' : (l + 1) % 2 === 0 ? 'single' : 'pair'
    const matches = placeColumn(x, previous, loserRounds[l], feeder)
    columns.push({ x, matches })
    previous = matches
  }

  const width =
    (columns[columns.length - 1]?.x ?? LAYOUT.paddingX) +
    LAYOUT.slotWidth +
    LAYOUT.paddingX
  // La altura la marca la ronda más baja de todas, no la última (que suele
  // quedar centrada verticalmente).
  const lowest = columns.flatMap((column) => column.matches)
  const height = lowest.length
    ? Math.max(...lowest.map((m) => m.y + matchHeight())) + LAYOUT.paddingY
    : 0

  return { columns, width, height }
}

/**
 * @typedef {Object} DeLayout
 * @property {number} width
 * @property {number} height
 * @property {Array<{
 *   id: string,
 *   title: string,
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   columns: Array<{ x: number, label: string, matches: DePositionedMatch[] }>,
 * }>} sections
 * @property {Array<{ points: string, lit: boolean, kind: string }>} connectors
 */

/**
 * @param {{
 *   winners: { rounds: Object[][], labels: string[] },
 *   losers: { rounds: Object[][], labels: string[] },
 *   grandFinal: { matches: Object[], labels: string[] },
 * }} brackets
 * @returns {DeLayout}
 */
export function computeDoubleEliminationLayout(brackets) {
  const wbRounds = brackets?.winners?.rounds ?? []
  const lbRounds = brackets?.losers?.rounds ?? []
  const gfMatches = brackets?.grandFinal?.matches ?? []

  // ── Bracket de ganadores (árbol regular 2:1) ────────────────────────────
  const wbColumns = []
  let wbPrevious = []
  for (let r = 0; r < wbRounds.length; r += 1) {
    const x = LAYOUT.paddingX + r * (LAYOUT.slotWidth + LAYOUT.roundGap)
    const matches = placeColumn(x, wbPrevious, wbRounds[r], r === 0 ? 'stack' : 'pair')
    wbColumns.push({ x, matches })
    wbPrevious = matches
  }
  const wbWidth =
    (wbColumns[wbColumns.length - 1]?.x ?? LAYOUT.paddingX) +
    LAYOUT.slotWidth +
    LAYOUT.paddingX
  const wbLowest = wbColumns.flatMap((column) => column.matches)
  const wbHeight = wbLowest.length
    ? Math.max(...wbLowest.map((m) => m.y + matchHeight())) + LAYOUT.paddingY
    : 0

  // ── Bracket de perdedores ───────────────────────────────────────────────
  const lbTree = computeLosersTree(lbRounds)
  const lbOffsetY = wbHeight + BLOCK_GAP

  // ── Gran final ──────────────────────────────────────────────────────────
  const gfX = Math.max(wbWidth, lbTree.width) + GF_GAP
  const wbFinal = wbColumns[wbColumns.length - 1]?.matches[0] ?? null
  const lbFinal = lbTree.columns[lbTree.columns.length - 1]?.matches[0] ?? null
  const gfCenterY =
    wbFinal && lbFinal
      ? (wbFinal.centerY + lbFinal.centerY + lbOffsetY) / 2
      : (wbFinal?.centerY ?? lbOffsetY)

  const gfColumn = {
    x: gfX,
    matches: gfMatches.map((match, index) => {
      const y = gfCenterY - matchHeight() / 2 + index * (matchHeight() + 12)
      return {
        match,
        x: gfX,
        y,
        centerY: y + matchHeight() / 2,
        frame: slot(gfX, y, LAYOUT.slotWidth, matchHeight()),
        slot1: slot(gfX, y, LAYOUT.slotWidth, LAYOUT.slotHeight),
        slot2: slot(
          gfX,
          y + LAYOUT.slotHeight + LAYOUT.matchInnerGap,
          LAYOUT.slotWidth,
          LAYOUT.slotHeight
        ),
      }
    }),
  }

  // ── Conectores ──────────────────────────────────────────────────────────
  /** @type {Array<{ points: string, lit: boolean, kind: string }>} */
  const connectors = []

  // WB:/tree
  for (let r = 0; r < wbColumns.length - 1; r += 1) {
    const dest = wbColumns[r + 1]
    for (let m = 0; m < dest.matches.length; m += 1) {
      const feeders = [
        { match: wbColumns[r].matches[m * 2], index: m * 2 },
        { match: wbColumns[r].matches[m * 2 + 1], index: m * 2 + 1 },
      ]
      for (const feeder of feeders) {
        if (!feeder.match?.match?.winner) continue
        const exitX = feeder.match.x + LAYOUT.slotWidth
        const target = dest.matches[m]
        const entrySlot = feeder.index % 2 === 0 ? target.slot1 : target.slot2
        connectors.push({
          points: winnerPathPoints(
            exitX,
            exitY(feeder.match),
            target.x,
            entrySlot.y + entrySlot.height / 2
          ),
          lit: true,
          kind: 'tree',
        })
      }
    }
  }

  // WB → LB (caídas de los perdedores)
  const dropTargets = new Map()
  for (let r = 0; r < wbColumns.length; r += 1) {
    for (let m = 0; m < wbColumns[r].matches.length; m += 1) {
      const positioned = wbColumns[r].matches[m]
      const match = positioned.match
      if (!match.winner) continue
      const loser = match.p1 != null && match.p2 != null
        ? match.winner === match.p1 ? match.p2 : match.p1
        : null
      if (!loser) continue

      // Destino: ronda 1 de la LB (r=0) o ronda 2j (1-based) para r >= 1.
      let lbRoundIndex
      let lbMatchIndex
      if (r === 0) {
        lbRoundIndex = 0
        lbMatchIndex = Math.floor(m / 2)
      } else {
        const j = r
        lbRoundIndex = 2 * j - 1
        lbMatchIndex = m
      }

      const target =
        lbTree.columns[lbRoundIndex]?.matches[lbMatchIndex]
      if (!target) continue

      const fromX = positioned.x + LAYOUT.slotWidth / 2
      const fromY = positioned.y + matchHeight()
      const toX = target.x + LAYOUT.slotWidth / 2
      const toY = target.y + lbOffsetY
      const midY = fromY + (toY - fromY) / 2

      connectors.push({
        points: `${fromX},${fromY} ${fromX},${midY} ${toX},${midY} ${toX},${toY}`,
        lit: true,
        kind: 'drop',
      })
      dropTargets.set(match.id, target)
    }
  }

  // LB:/tree (alimentación alterna)
  for (let l = 0; l < lbTree.columns.length - 1; l += 1) {
    const dest = lbTree.columns[l + 1]
    const feederType = (l + 2) % 2 === 0 ? 'single' : 'pair'
    for (let m = 0; m < dest.matches.length; m += 1) {
      const feederIndexes =
        feederType === 'single' ? [m] : [m * 2, m * 2 + 1]
      for (const fi of feederIndexes) {
        const feeder = lbTree.columns[l].matches[fi]
        if (!feeder?.match?.winner) continue
        const exitX = feeder.x + LAYOUT.slotWidth
        const target = dest.matches[m]
        // El alimentador par entra por arriba y el impar por abajo.
        const targetSlot = fi % 2 === 0 ? target.slot1 : target.slot2
        connectors.push({
          points: winnerPathPoints(
            exitX,
            exitY(feeder) + lbOffsetY,
            target.x,
            targetSlot.y + targetSlot.height / 2 + lbOffsetY
          ),
          lit: true,
          kind: 'tree',
        })
      }
    }
  }

  // Ganadores → gran final
  if (wbFinal?.match?.winner && gfColumn.matches[0]) {
    const exitX = wbFinal.x + LAYOUT.slotWidth
    const target = gfColumn.matches[0]
    connectors.push({
      points: winnerPathPoints(
        exitX,
        exitY(wbFinal),
        target.x,
        target.slot1.y + target.slot1.height / 2
      ),
      lit: true,
      kind: 'final',
    })
  }

  // Perdedores → gran final
  if (lbFinal?.match?.winner && gfColumn.matches[0]) {
    const exitX = lbFinal.x + LAYOUT.slotWidth
    const target = gfColumn.matches[0]
    connectors.push({
      points: winnerPathPoints(
        exitX,
        exitY(lbFinal) + lbOffsetY,
        target.x,
        target.slot2.y + target.slot2.height / 2
      ),
      lit: true,
      kind: 'final',
    })
  }

  const gfHeight = gfColumn.matches.length
    ? gfColumn.matches[gfColumn.matches.length - 1].y +
      matchHeight() +
      LAYOUT.paddingY
    : 0

  const width = gfX + LAYOUT.slotWidth + LAYOUT.paddingX
  const height = Math.max(wbHeight, lbOffsetY + lbTree.height, gfHeight)

  return {
    width,
    height,
    sections: [
      {
        id: 'winners',
        title: 'Ganadores',
        x: 0,
        y: 0,
        width: wbWidth,
        height: wbHeight,
        columns: wbColumns.map((column, index) => ({
          x: column.x,
          label: brackets.winners.labels[index] ?? '',
          matches: column.matches,
        })),
      },
      {
        id: 'losers',
        title: 'Perdedores',
        x: 0,
        y: lbOffsetY,
        width: lbTree.width,
        height: lbTree.height,
        columns: lbTree.columns.map((column, index) => ({
          x: column.x,
          label: brackets.losers.labels[index] ?? '',
          matches: column.matches.map((match) => ({
            ...match,
            y: match.y + lbOffsetY,
            centerY: match.centerY + lbOffsetY,
            frame: { ...match.frame, y: match.frame.y + lbOffsetY },
            slot1: { ...match.slot1, y: match.slot1.y + lbOffsetY },
            slot2: { ...match.slot2, y: match.slot2.y + lbOffsetY },
          })),
        })),
      },
      {
        id: 'grand-final',
        title: 'Gran final',
        x: gfX,
        y: 0,
        width: LAYOUT.slotWidth + LAYOUT.paddingX,
        height: gfHeight,
        columns: [
          {
            x: gfX,
            label: brackets.grandFinal.labels[0] ?? 'Gran final',
            matches: gfColumn.matches,
          },
        ],
      },
    ],
    connectors,
  }
}
