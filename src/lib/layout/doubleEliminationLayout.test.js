import { describe, it, expect } from 'vitest'
import { doubleElimination } from '../formats/doubleElimination.js'
import { computeDoubleEliminationLayout } from './doubleEliminationLayout.js'

const players = ['Ana', 'Bruno', 'Carla', 'Dan', 'Elena', 'Felix', 'Gema', 'Hugo']

describe('computeDoubleEliminationLayout', () => {
  it('desplaza el bracket de perdedores y mantiene ids únicos', () => {
    const state = doubleElimination.create(players)
    const brackets = doubleElimination.getBrackets(state)
    const layout = computeDoubleEliminationLayout(brackets)

    const winners = layout.sections.find((s) => s.id === 'winners')
    const losers = layout.sections.find((s) => s.id === 'losers')
    const gf = layout.sections.find((s) => s.id === 'grand-final')

    expect(winners).toBeTruthy()
    expect(losers).toBeTruthy()
    expect(gf).toBeTruthy()
    expect(losers.y).toBeGreaterThan(winners.height)

    const loserSlots = losers.columns.flatMap((c) => c.matches)
    expect(loserSlots.length).toBeGreaterThan(0)
    expect(Math.min(...loserSlots.map((m) => m.slot1.y))).toBeGreaterThanOrEqual(losers.y)

    const ids = layout.sections.flatMap((section) =>
      section.columns.flatMap((column) => column.matches.map((m) => m.match.id))
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.some((id) => id.startsWith('gf-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('lb-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('wb-'))).toBe(true)
  })

  it('coloca la gran final a la derecha de WB/LB', () => {
    const state = doubleElimination.create(players)
    const layout = computeDoubleEliminationLayout(doubleElimination.getBrackets(state))
    const winners = layout.sections.find((s) => s.id === 'winners')
    const losers = layout.sections.find((s) => s.id === 'losers')
    const gf = layout.sections.find((s) => s.id === 'grand-final')

    const gfMatch = gf.columns[0].matches[0]
    expect(gfMatch.x).toBeGreaterThanOrEqual(Math.max(winners.width, losers.width))
    expect(gfMatch.slot1.width).toBeGreaterThan(0)
    expect(gfMatch.slot2.height).toBeGreaterThan(0)
  })
})
