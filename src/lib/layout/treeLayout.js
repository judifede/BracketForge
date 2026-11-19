/**
 * Layout genérico de un árbol de partidos (eliminación simple, losers bracket…).
 *
 * Calcula la geometría de las rondas (columnas) y los conectores entre ellas.
 * No sabe nada de trofeos ni de campeonato: eso lo añade `bracketLayout.js`.
 */

export const LAYOUT = {
  slotWidth: 180,
  slotHeight: 36,
  championSlotHeight: 42,
  matchInnerGap: 1,
  roundGap: 84,
  labelHeight: 44,
  paddingX: 28,
  paddingY: 20,
  trophySize: 40,
  trophyGap: 12,
}

/**
 * Vertical span of one match (two stacked slots).
 * @returns {number}
 */
export function matchHeight() {
  return LAYOUT.slotHeight * 2 + LAYOUT.matchInnerGap
}

/**
 * Vertical gap between matches in round 0 so later rounds nest cleanly.
 * @param {number} round0MatchCount
 * @returns {number}
 */
function baseMatchStep(round0MatchCount) {
  const mh = matchHeight()
  // Enough room so final sits centered; scale gap with tree size
  const minGap = 20
  return mh + Math.max(minGap, 28 - Math.min(round0MatchCount, 8) * 2)
}

/**
 * Orthogonal elbow that stays on exitY until near the destination, then turns.
 * Bend sits at 80% of the horizontal gap (near x2).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {string}
 */
export function winnerPathPoints(x1, y1, x2, y2) {
  const gap = x2 - x1
  const bendX = x1 + gap * 0.8
  return `${x1},${y1} ${bendX},${y1} ${bendX},${y2} ${x2},${y2}`
}

/**
 * Vertical exit of a match connector: winner slot when decided, else match center.
 * @param {{ match: Object, centerY: number, slot1: object, slot2: object }} positioned
 * @returns {number}
 */
export function connectorExitY(positioned) {
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
 * Vertical entry into the next match: top slot for even feeders, bottom for odd.
 * @param {{ slot1: object, slot2: object }} nextMatch
 * @param {number} fromMatchIndex
 * @returns {number}
 */
export function connectorEntryY(nextMatch, fromMatchIndex) {
  const slot = fromMatchIndex % 2 === 0 ? nextMatch.slot1 : nextMatch.slot2
  return slot.y + slot.height / 2
}

/**
 * @typedef {Object} PositionedMatch
 * @property {Object} match
 * @property {number} x
 * @property {number} y
 * @property {number} centerY
 * @property {{ x: number, y: number, width: number, height: number }} frame
 * @property {{ x: number, y: number, width: number, height: number }} slot1
 * @property {{ x: number, y: number, width: number, height: number }} slot2
 */

/**
 * @typedef {Object} TreeLayout
 * @property {number} width
 * @property {number} height
 * @property {Array<{ x: number, matches: PositionedMatch[] }>} columns
 * @property {Array<{ points: string, lit: boolean }>} connectors
 */

/**
 * Layout of a bracket tree: rounds as columns, matches stacked, feeders connected.
 *
 * @param {Array<Array<Object>>} rounds
 * @returns {TreeLayout}
 */
export function computeTreeLayout(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return { width: 0, height: 0, columns: [], connectors: [] }
  }

  const {
    slotWidth,
    slotHeight,
    matchInnerGap,
    roundGap,
    labelHeight,
    paddingX,
    paddingY,
  } = LAYOUT
  const mh = matchHeight()
  const step0 = baseMatchStep(rounds[0].length)

  /** @type {PositionedMatch[][]} */
  const positioned = []

  for (let r = 0; r < rounds.length; r += 1) {
    const x = paddingX + r * (slotWidth + roundGap)
    /** @type {PositionedMatch[]} */
    const columnMatches = []

    for (let m = 0; m < rounds[r].length; m += 1) {
      let y
      if (r === 0) {
        y = paddingY + labelHeight + m * step0
      } else {
        const a = positioned[r - 1][m * 2]
        const b = positioned[r - 1][m * 2 + 1]
        const mid = (a.centerY + b.centerY) / 2
        y = mid - mh / 2
      }

      const centerY = y + mh / 2
      columnMatches.push({
        match: rounds[r][m],
        x,
        y,
        centerY,
        frame: { x, y, width: slotWidth, height: mh },
        slot1: { x, y, width: slotWidth, height: slotHeight },
        slot2: {
          x,
          y: y + slotHeight + matchInnerGap,
          width: slotWidth,
          height: slotHeight,
        },
      })
    }
    positioned.push(columnMatches)
  }

  /** @type {Array<{ points: string, lit: boolean }>} */
  const connectors = []
  for (let r = 0; r < positioned.length - 1; r += 1) {
    const destCount = positioned[r + 1].length
    for (let m = 0; m < destCount; m += 1) {
      const aIndex = m * 2
      const bIndex = m * 2 + 1
      const a = positioned[r][aIndex]
      const b = positioned[r][bIndex]
      const to = positioned[r + 1][m]
      const exitX = a.x + slotWidth

      if (a.match.winner) {
        connectors.push({
          points: winnerPathPoints(
            exitX,
            connectorExitY(a),
            to.x,
            connectorEntryY(to, aIndex)
          ),
          lit: true,
        })
      }
      if (b.match.winner) {
        connectors.push({
          points: winnerPathPoints(
            exitX,
            connectorExitY(b),
            to.x,
            connectorEntryY(to, bIndex)
          ),
          lit: true,
        })
      }
    }
  }

  const maxY = Math.max(
    ...positioned.flatMap((column) => column.map((m) => m.y + mh))
  )
  const lastColumn = positioned[positioned.length - 1]
  const width =
    (lastColumn[0]?.x ?? paddingX) + slotWidth + paddingX

  return {
    width,
    height: maxY + paddingY,
    columns: positioned.map((columnMatches) => ({
      x: columnMatches[0]?.x ?? paddingX,
      matches: columnMatches,
    })),
    connectors,
  }
}
