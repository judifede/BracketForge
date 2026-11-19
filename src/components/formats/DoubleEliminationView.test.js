// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DoubleEliminationView from './DoubleEliminationView.vue'
import { doubleElimination } from '../../lib/formats/doubleElimination.js'

const players = ['Ana', 'Bruno', 'Carla', 'Dan']

describe('DoubleEliminationView', () => {
  it('incluye defs de relleno de slot para que los clics tengan hit target', () => {
    const state = doubleElimination.create(players)
    const wrapper = mount(DoubleEliminationView, { props: { state } })
    const svg = wrapper.find('svg.bracket-svg')

    expect(svg.find('#cbg-slot-idle').exists()).toBe(true)
    expect(svg.find('#cbg-slot-pending').exists()).toBe(true)
    expect(svg.find('#cbg-slot-winner').exists()).toBe(true)
  })

  it('emite apply-result al hacer clic en un slot seleccionable', async () => {
    const state = doubleElimination.create(players)
    const wrapper = mount(DoubleEliminationView, { props: { state } })

    const buttons = wrapper.findAll('[role="button"]')
    expect(buttons.length).toBeGreaterThan(0)

    await buttons[0].trigger('click')

    const emitted = wrapper.emitted('apply-result')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({
      matchId: 'wb-r0-m0',
      result: { winner: 'Ana' },
    })
  })

  it('no emite si el slot no es seleccionable (ya es el ganador)', async () => {
    let state = doubleElimination.create(players)
    state = doubleElimination.applyResult(state, 'wb-r0-m0', { winner: 'Ana' })
    const wrapper = mount(DoubleEliminationView, { props: { state } })

    const anaSlot = wrapper
      .findAll('[role="button"]')
      .find((node) => node.attributes('aria-label') === 'Elegir ganador: Ana')

    // Ana ya ganó ese partido: no debe ser botón seleccionable allí.
    // Bruno sí (para corregir).
    expect(anaSlot).toBeUndefined()

    const brunoSlot = wrapper
      .findAll('[role="button"]')
      .find((node) => node.attributes('aria-label') === 'Elegir ganador: Bruno')
    expect(brunoSlot).toBeTruthy()

    await brunoSlot.trigger('click')
    expect(wrapper.emitted('apply-result')[0][0]).toEqual({
      matchId: 'wb-r0-m0',
      result: { winner: 'Bruno' },
    })
  })

  it('no marca byes ni pendientes como seleccionables', () => {
    const state = doubleElimination.create(['Ana', 'Bruno', 'Carla'])
    const wrapper = mount(DoubleEliminationView, { props: { state } })

    const labels = wrapper
      .findAll('[role="button"]')
      .map((node) => node.attributes('aria-label'))

    expect(labels.length).toBeGreaterThan(0)
    expect(labels.every((label) => label && !label.includes('Descanso'))).toBe(true)
    expect(labels.every((label) => label && !label.includes('Por definir'))).toBe(true)
  })

  it('isSelectable coincide con canPick del motor para cada partido visible', () => {
    let state = doubleElimination.create(players)
    state = doubleElimination.applyResult(state, 'wb-r0-m0', { winner: 'Ana' })
    const wrapper = mount(DoubleEliminationView, { props: { state } })

    const buttons = wrapper.findAll('[role="button"]')
    for (const button of buttons) {
      const label = button.attributes('aria-label') || ''
      const player = label.replace(/^Elegir ganador:\s*/, '')
      // Al menos un partido WB debe permitir a Bruno (corrección).
      expect(player).toBeTruthy()
      expect(player === 'Descanso' || player === 'Por definir').toBe(false)
    }

    expect(
      buttons.some((node) => node.attributes('aria-label') === 'Elegir ganador: Bruno')
    ).toBe(true)
    expect(doubleElimination.canPick(state, 'wb-r0-m0', 'Bruno')).toBe(true)
    expect(doubleElimination.canPick(state, 'wb-r0-m0', 'Ana')).toBe(false)
  })
})
