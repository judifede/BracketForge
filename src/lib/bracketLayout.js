import {
  computeTreeLayout,
  connectorExitY,
  LAYOUT,
  matchHeight,
  winnerPathPoints,
} from './layout/treeLayout.js'

/**
 * @typedef {import('./bracket.js').Bracket} Bracket
 * @typedef {import('./bracket.js').Match} Match
 */

export { LAYOUT, matchHeight }

/**
 * Layout of the single-elimination bracket: tree + trophy + champion slot.
 *
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
    championSlotHeight,
    roundGap,
    paddingX,
    paddingY,
    trophySize,
    trophyGap,
  } = LAYOUT

  const tree = computeTreeLayout(rounds)

  const lastRound = tree.columns[tree.columns.length - 1]
  const finalMatch = lastRound.matches[0]
  const championX = finalMatch.x + slotWidth + roundGap
  const championY = finalMatch.centerY - championSlotHeight / 2
  const trophy = {
    x: championX + (slotWidth - trophySize) / 2,
    y: championY - trophyGap - trophySize,
    size: trophySize,
  }
  const championCenterY = championY + championSlotHeight / 2

  const connectors = [...tree.connectors]

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
    ...tree.columns.flatMap((column) =>
      column.matches.map((m) => m.y + LAYOUT.slotHeight * 2 + LAYOUT.matchInnerGap)
    ),
    championY + championSlotHeight
  )

  const width = championX + slotWidth + paddingX
  const height = maxY + paddingY

  return {
    width,
    height,
    rounds: tree.columns.map((column, r) => ({
      label: roundLabel(r, rounds.length, rounds[r].length),
      x: column.x,
      matches: column.matches,
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

/**
 * Human-readable round label.
 * @param {number} roundIndex
 * @param {number} totalRounds
 * @param {number} matchCount
 * @returns {string}
 */
function roundLabel(roundIndex, totalRounds, matchCount) {
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2 && totalRounds >= 2) return 'Semifinal'
  return `Ronda de ${matchCount * 2}`
}
