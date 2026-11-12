import { roundLabel } from './bracket.js'

/**
 * @typedef {import('./bracket.js').Bracket} Bracket
 * @typedef {import('./bracket.js').Match} Match
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
function winnerPathPoints(x1, y1, x2, y2) {
  const gap = x2 - x1
  const bendX = x1 + gap * 0.8
  return `${x1},${y1} ${bendX},${y1} ${bendX},${y2} ${x2},${y2}`
}

/**
 * Vertical exit of a match connector: winner slot when decided, else match center.
 * @param {{
 *   match: Match,
 *   centerY: number,
 *   slot1: { y: number, height: number },
 *   slot2: { y: number, height: number },
 * }} positioned
 * @returns {number}
 */
function connectorExitY(positioned) {
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
 * @param {{
 *   slot1: { y: number, height: number },
 *   slot2: { y: number, height: number },
 * }} nextMatch
 * @param {number} fromMatchIndex
 * @returns {number}
 */
function connectorEntryY(nextMatch, fromMatchIndex) {
  const slot = fromMatchIndex % 2 === 0 ? nextMatch.slot1 : nextMatch.slot2
  return slot.y + slot.height / 2
}

/**
 * @param {Bracket} bracket
 * @returns {{
 *   width: number,
 *   height: number,
 *   rounds: Array<{
 *     label: string,
 *     x: number,
 *     matches: Array<{
 *       match: Match,
 *       x: number,
 *       y: number,
 *       centerY: number,
 *       frame: { x: number, y: number, width: number, height: number },
 *       slot1: { x: number, y: number, width: number, height: number },
 *       slot2: { x: number, y: number, width: number, height: number },
 *     }>
 *   }>,
 *   connectors: Array<{ points: string, lit: boolean }>,
 *   trophy: { x: number, y: number, size: number },
 *   championSlot: { x: number, y: number, width: number, height: number } | null,
 *   championLabel: { x: number, label: string } | null,
 * }}
 */
export function computeBracketLayout(bracket) {
  const rounds = bracket.rounds
  if (!rounds.length) {
    return {
      width: 0,
      height: 0,
      rounds: [],
      connectors: [],
      trophy: { x: 0, y: 0, size: LAYOUT.trophySize },
      championSlot: null,
      championLabel: null,
    }
  }

  const {
    slotWidth,
    slotHeight,
    championSlotHeight,
    matchInnerGap,
    roundGap,
    labelHeight,
    paddingX,
    paddingY,
    trophySize,
    trophyGap,
  } = LAYOUT
  const mh = matchHeight()
  const step0 = baseMatchStep(rounds[0].length)

  /** @type {Array<{ match: Match, x: number, y: number, centerY: number, frame: object, slot1: object, slot2: object }[]>} */
  const positioned = []

  for (let r = 0; r < rounds.length; r += 1) {
    const x = paddingX + r * (slotWidth + roundGap)
    /** @type {typeof positioned[0]} */
    const roundMatches = []

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
      roundMatches.push({
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
    positioned.push(roundMatches)
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

  const lastRound = positioned[positioned.length - 1]
  const finalMatch = lastRound[0]
  const championX = finalMatch.x + slotWidth + roundGap
  const championY = finalMatch.centerY - championSlotHeight / 2
  const trophy = {
    x: championX + (slotWidth - trophySize) / 2,
    y: championY - trophyGap - trophySize,
    size: trophySize,
  }
  const championCenterY = championY + championSlotHeight / 2

  if (finalMatch.match.winner) {
    connectors.push({
      points: winnerPathPoints(
        finalMatch.x + slotWidth,
        connectorExitY(finalMatch),
        championX,
        championCenterY
      ),
      lit: true,
    })
  }

  const maxY = Math.max(
    ...positioned.flatMap((rm) => rm.map((m) => m.y + mh)),
    championY + championSlotHeight
  )

  const width = championX + slotWidth + paddingX
  const height = maxY + paddingY

  return {
    width,
    height,
    rounds: positioned.map((matches, r) => ({
      label: roundLabel(r, rounds.length, rounds[r].length),
      x: matches[0]?.x ?? paddingX + r * (slotWidth + roundGap),
      matches,
    })),
    connectors,
    trophy,
    championSlot: {
      x: championX,
      y: championY,
      width: slotWidth,
      height: championSlotHeight,
    },
    championLabel: {
      x: championX,
      label: 'Campeón',
    },
  }
}
