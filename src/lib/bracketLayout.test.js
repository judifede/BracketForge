import { describe, it, expect } from 'vitest'
import { buildBracket } from './bracket.js'
import { computeBracketLayout, LAYOUT, matchHeight } from './bracketLayout.js'

/**
 * Late-bend elbow: horizontal along y1 until 80% of the gap, then vertical to y2.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {string}
 */
function expectedWinnerPath(x1, y1, x2, y2) {
  const bendX = x1 + (x2 - x1) * 0.8
  return `${x1},${y1} ${bendX},${y1} ${bendX},${y2} ${x2},${y2}`
}

describe('matchHeight', () => {
  it('stacks two slots with inner gap', () => {
    expect(matchHeight()).toBe(LAYOUT.slotHeight * 2 + LAYOUT.matchInnerGap)
  })
})

describe('computeBracketLayout', () => {
  it('returns empty layout for empty rounds', () => {
    const layout = computeBracketLayout({ seeds: [], rounds: [] })
    expect(layout.width).toBe(0)
    expect(layout.height).toBe(0)
    expect(layout.rounds).toEqual([])
    expect(layout.championSlot).toBeNull()
  })

  it('positions rounds and champion for 4 players without winner paths', () => {
    const bracket = buildBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    const layout = computeBracketLayout(bracket)

    expect(layout.rounds).toHaveLength(2)
    expect(layout.rounds[0].matches).toHaveLength(2)
    expect(layout.rounds[1].matches).toHaveLength(1)
    expect(layout.rounds[0].label).toMatch(/Ronda|Semifinal|Final/i)
    expect(layout.rounds[1].label).toBe('Final')
    expect(layout.connectors).toHaveLength(0)
    expect(layout.championSlot).toMatchObject({
      width: LAYOUT.slotWidth,
      height: LAYOUT.championSlotHeight,
    })
    expect(layout.championLabel).toMatchObject({
      x: layout.championSlot.x,
      label: 'Campeón',
    })
    expect(layout.trophy.x).toBeCloseTo(
      layout.championSlot.x + (LAYOUT.slotWidth - LAYOUT.trophySize) / 2,
      5
    )
    expect(layout.trophy.y).toBeLessThan(layout.championSlot.y)
    expect(layout.width).toBeGreaterThan(LAYOUT.slotWidth)
    expect(layout.height).toBeGreaterThan(LAYOUT.slotHeight)
  })

  it('connects the final into the champion slot only when there is a winner', () => {
    const bracket = buildBracket(['Ana', 'Bob'])
    bracket.rounds[0][0].winner = 'Ana'
    const layout = computeBracketLayout(bracket)
    const final = layout.rounds[layout.rounds.length - 1].matches[0]
    const toChampion = layout.connectors[layout.connectors.length - 1]
    const exitY = final.slot1.y + final.slot1.height / 2
    const champY =
      layout.championSlot.y + layout.championSlot.height / 2

    expect(layout.connectors).toHaveLength(1)
    expect(toChampion).toEqual({
      points: expectedWinnerPath(
        final.x + LAYOUT.slotWidth,
        exitY,
        layout.championSlot.x,
        champY
      ),
      lit: true,
    })
  })

  it('emits no feeder paths until a winner is set', () => {
    const bracket = buildBracket(['A', 'B', 'C', 'D'])
    const layout = computeBracketLayout(bracket)
    expect(layout.connectors).toHaveLength(0)
  })

  it('emits only the top feeder path when the top feeder wins', () => {
    const bracket = buildBracket(['A', 'B', 'C', 'D'])
    bracket.rounds[0][0].winner = 'A' // top feeder, top slot
    const layout = computeBracketLayout(bracket)

    const [topFeeder] = layout.rounds[0].matches
    const next = layout.rounds[1].matches[0]
    const exitY = topFeeder.slot1.y + topFeeder.slot1.height / 2
    const entryY = next.slot1.y + next.slot1.height / 2

    expect(layout.connectors).toHaveLength(1)
    expect(layout.connectors[0]).toEqual({
      points: expectedWinnerPath(
        topFeeder.x + LAYOUT.slotWidth,
        exitY,
        next.x,
        entryY
      ),
      lit: true,
    })
  })

  it('emits only the bottom feeder path when the bottom feeder wins', () => {
    const bracket = buildBracket(['A', 'B', 'C', 'D'])
    bracket.rounds[0][1].winner = 'D' // bottom feeder, bottom slot
    const layout = computeBracketLayout(bracket)

    const [, bottomFeeder] = layout.rounds[0].matches
    const next = layout.rounds[1].matches[0]
    const exitY = bottomFeeder.slot2.y + bottomFeeder.slot2.height / 2
    const entryY = next.slot2.y + next.slot2.height / 2

    expect(layout.connectors).toHaveLength(1)
    expect(layout.connectors[0]).toEqual({
      points: expectedWinnerPath(
        bottomFeeder.x + LAYOUT.slotWidth,
        exitY,
        next.x,
        entryY
      ),
      lit: true,
    })
  })

  it('routes each winner along its slot until a late bend into the destination', () => {
    const bracket = buildBracket(['A', 'B', 'C', 'D'])
    bracket.rounds[0][0].winner = 'A' // top → feeds next.p1
    bracket.rounds[0][1].winner = 'D' // bottom → feeds next.p2
    const layout = computeBracketLayout(bracket)

    const [topFeeder, bottomFeeder] = layout.rounds[0].matches
    const next = layout.rounds[1].matches[0]
    const [pathA, pathB] = layout.connectors

    const topExitY = topFeeder.slot1.y + topFeeder.slot1.height / 2
    const bottomExitY = bottomFeeder.slot2.y + bottomFeeder.slot2.height / 2
    const topEntryY = next.slot1.y + next.slot1.height / 2
    const bottomEntryY = next.slot2.y + next.slot2.height / 2
    const exitX = topFeeder.x + LAYOUT.slotWidth
    const bendXA = exitX + (next.x - exitX) * 0.8
    const bendXB = exitX + (next.x - exitX) * 0.8

    expect(layout.connectors).toHaveLength(2)
    expect(pathA).toEqual({
      points: expectedWinnerPath(exitX, topExitY, next.x, topEntryY),
      lit: true,
    })
    expect(pathB).toEqual({
      points: expectedWinnerPath(exitX, bottomExitY, next.x, bottomEntryY),
      lit: true,
    })
    // Independent late bends — not a shared center spine
    expect(bendXA).toBeGreaterThan(exitX + (next.x - exitX) / 2)
    expect(bendXB).toBeGreaterThan(exitX + (next.x - exitX) / 2)
    expect(pathA.points).toContain(`${bendXA},${topExitY}`)
    expect(pathB.points).toContain(`${bendXB},${bottomExitY}`)
  })

  it('nests later rounds between earlier match centers', () => {
    const bracket = buildBracket(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
    const layout = computeBracketLayout(bracket)
    const round0 = layout.rounds[0].matches
    const round1 = layout.rounds[1].matches

    const mid01 = (round0[0].centerY + round0[1].centerY) / 2
    expect(round1[0].centerY).toBeCloseTo(mid01, 5)
  })
})
