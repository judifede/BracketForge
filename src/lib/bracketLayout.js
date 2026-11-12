import { roundLabel } from './bracket.js'

/**
 * @typedef {import('./bracket.js').Bracket} Bracket
 * @typedef {import('./bracket.js').Match} Match
 */

export const LAYOUT = {
  slotWidth: 180,
  slotHeight: 36,
  matchInnerGap: 1,
  roundGap: 84,
  labelHeight: 44,
  paddingX: 28,
  paddingY: 20,
  trophySize: 28,
  trophyGap: 14,
  winBarWidth: 3,
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
 *   connectors: Array<{ points: string }>,
 *   trophy: { x: number, y: number, size: number },
 *   championSlot: { x: number, y: number, width: number, height: number } | null,
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
    }
  }

  const { slotWidth, slotHeight, matchInnerGap, roundGap, labelHeight, paddingX, paddingY, trophySize, trophyGap } =
    LAYOUT
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

  /** @type {Array<{ points: string }>} */
  const connectors = []
  for (let r = 0; r < positioned.length - 1; r += 1) {
    for (let m = 0; m < positioned[r].length; m += 1) {
      const from = positioned[r][m]
      const to = positioned[r + 1][Math.floor(m / 2)]
      const x1 = from.x + slotWidth
      const y1 = from.centerY
      const x2 = to.x
      const y2 = to.centerY
      const midX = x1 + (x2 - x1) / 2
      connectors.push({
        points: `${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`,
      })
    }
  }

  const lastRound = positioned[positioned.length - 1]
  const finalMatch = lastRound[0]
  const championX = finalMatch.x + slotWidth + trophyGap + trophySize + 8
  const championY = finalMatch.centerY - slotHeight / 2
  const trophy = {
    x: finalMatch.x + slotWidth + trophyGap,
    y: finalMatch.centerY - trophySize / 2 - slotHeight / 2 - 4,
    size: trophySize,
  }

  const maxY = Math.max(
    ...positioned.flatMap((rm) => rm.map((m) => m.y + mh)),
    championY + slotHeight
  )

  const width =
    championX + slotWidth + paddingX
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
      height: slotHeight,
    },
  }
}
