// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SwissView from './SwissView.vue'
import { swiss } from '../../lib/formats/swiss.js'

const players = ['A', 'B', 'C', 'D']

describe('SwissView', () => {
  it('emite generate-round y deshabilita cuando no hay más rondas', async () => {
    const state = swiss.create(players) // totalRounds = 2
    const wrapper = mount(SwissView, { props: { state } })

    const buttons = wrapper.findAll('button')
    const generate = buttons.find((node) => node.text().includes('Generar ronda'))
    expect(generate.attributes('disabled')).toBeUndefined()

    await generate.trigger('click')
    expect(wrapper.emitted('apply-action')[0][0]).toEqual({
      type: 'generate-round',
    })
  })

  it('emite undo-round cuando hay rondas', async () => {
    let state = swiss.create(players, { totalRounds: 3 })
    state = swiss.generateRound(state)
    const wrapper = mount(SwissView, { props: { state } })

    const undo = wrapper
      .findAll('button')
      .find((node) => node.text().includes('Deshacer ronda'))
    expect(undo.attributes('disabled')).toBeUndefined()

    await undo.trigger('click')
    expect(wrapper.emitted('apply-action')[0][0]).toEqual({
      type: 'undo-round',
    })
  })

  it('no ofrece generar por encima del totalRounds del setup', async () => {
    let state = swiss.create(players, { totalRounds: 1 })
    state = swiss.generateRound(state)
    for (const match of state.rounds[0].matches) {
      if (match.p2 != null) {
        state = swiss.applyResult(state, match.id, { a: 1, b: 0 })
      }
    }
    const wrapper = mount(SwissView, { props: { state } })

    const generate = wrapper
      .findAll('button')
      .find((node) => node.text().includes('Generar ronda'))
    expect(generate.attributes('disabled')).toBeDefined()
  })

  it('reenvía apply-result desde ScoreInput', async () => {
    let state = swiss.create(players, { totalRounds: 2 })
    state = swiss.generateRound(state)
    const wrapper = mount(SwissView, { props: { state } })

    const input = wrapper.find('input.rr-score')
    await input.setValue('2')
    await input.trigger('change')

    expect(wrapper.emitted('apply-result')[0][0]).toMatchObject({
      matchId: state.rounds[0].matches.find((match) => match.p2 != null).id,
      result: { a: 2, b: 0 },
    })
  })
})
