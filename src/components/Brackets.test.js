// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Brackets from './Brackets.vue'
import { singleElimination } from '../lib/formats/singleElimination.js'

const players = ['Ana', 'Bruno', 'Carla', 'Dan']

describe('Brackets (single elimination)', () => {
  it('incluye defs de relleno de slot para hit targets SVG', () => {
    const state = singleElimination.create(players)
    const wrapper = mount(Brackets, { props: { state } })
    const svg = wrapper.find('svg.bracket-svg')

    expect(svg.find('#cbg-slot-idle').exists()).toBe(true)
    expect(svg.find('#cbg-slot-pending').exists()).toBe(true)
    expect(svg.find('#cbg-slot-winner').exists()).toBe(true)
  })

  it('emite apply-result al hacer clic en un slot seleccionable', async () => {
    const state = singleElimination.create(players)
    const wrapper = mount(Brackets, { props: { state } })

    const buttons = wrapper.findAll('[role="button"]')
    expect(buttons.length).toBeGreaterThan(0)

    await buttons[0].trigger('click')

    expect(wrapper.emitted('apply-result')[0][0]).toEqual({
      matchId: 'r0-m0',
      result: { winner: 'Ana' },
    })
  })

  it('permite corregir el ganador (el perdedor sigue seleccionable)', async () => {
    let state = singleElimination.create(players)
    state = singleElimination.applyResult(state, 'r0-m0', { winner: 'Ana' })
    const wrapper = mount(Brackets, { props: { state } })

    const anaSlot = wrapper
      .findAll('[role="button"]')
      .find((node) => node.attributes('aria-label') === 'Elegir ganador: Ana')
    expect(anaSlot).toBeUndefined()

    const brunoSlot = wrapper
      .findAll('[role="button"]')
      .find((node) => node.attributes('aria-label') === 'Elegir ganador: Bruno')
    expect(brunoSlot).toBeTruthy()

    await brunoSlot.trigger('click')
    expect(wrapper.emitted('apply-result')[0][0]).toEqual({
      matchId: 'r0-m0',
      result: { winner: 'Bruno' },
    })
  })

  it('no marca slots de bye/pendientes como seleccionables', () => {
    // 3 jugadores → padding con bye en ronda 0.
    const state = singleElimination.create(['Ana', 'Bruno', 'Carla'])
    const wrapper = mount(Brackets, { props: { state } })

    const labels = wrapper.findAll('[role="button"]').map((n) => n.attributes('aria-label'))
    expect(labels.every((label) => label && !label.includes('Descanso'))).toBe(true)
    expect(labels.every((label) => label && !label.includes('Por definir'))).toBe(true)
  })
})
