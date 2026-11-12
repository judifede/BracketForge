import { describe, it, expect } from 'vitest'
import { buildBracket } from './bracket.js'
import { computeBracketLayout, LAYOUT, matchHeight } from './bracketLayout.js'

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

  it('positions rounds, connectors and champion for 4 players', () => {
    const bracket = buildBracket(['Ana', 'Bob', 'Carla', 'Dan'])
    const layout = computeBracketLayout(bracket)

    expect(layout.rounds).toHaveLength(2)
    expect(layout.rounds[0].matches).toHaveLength(2)
    expect(layout.rounds[1].matches).toHaveLength(1)
    expect(layout.rounds[0].label).toMatch(/Ronda|Semifinal|Final/i)
    expect(layout.rounds[1].label).toBe('Final')
    expect(layout.connectors.length).toBeGreaterThan(0)
    expect(layout.championSlot).toMatchObject({
      width: LAYOUT.slotWidth,
      height: LAYOUT.slotHeight,
    })
    expect(layout.width).toBeGreaterThan(LAYOUT.slotWidth)
    expect(layout.height).toBeGreaterThan(LAYOUT.slotHeight)
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
