// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RoundRobinView from './RoundRobinView.vue'
import { roundRobin } from '../../lib/formats/roundRobin.js'

describe('RoundRobinView', () => {
  it('reenvía apply-result al introducir un marcador', async () => {
    const state = roundRobin.create(['Ana', 'Bruno', 'Carla', 'Dan'])
    const wrapper = mount(RoundRobinView, { props: { state } })

    const matchId = roundRobin.getSchedule(state)[0][0].id
    const input = wrapper.find('input.rr-score')
    await input.setValue('1')
    await input.trigger('change')

    expect(wrapper.emitted('apply-result')[0][0]).toEqual({
      matchId,
      result: { a: 1, b: 0 },
    })
  })

  it('muestra el descanso en jornadas con campo impar', () => {
    const state = roundRobin.create(['A', 'B', 'C'])
    const wrapper = mount(RoundRobinView, { props: { state } })
    expect(wrapper.text()).toContain('Descanso')
    expect(wrapper.text()).toMatch(/A|B|C/)
  })

  it('coloca las jornadas en una rejilla multi-columna', () => {
    const state = roundRobin.create(['Ana', 'Bruno', 'Carla', 'Dan'])
    const wrapper = mount(RoundRobinView, { props: { state } })
    expect(wrapper.find('.rr-rounds-grid').exists()).toBe(true)
    expect(wrapper.findAll('.rr-round').length).toBeGreaterThan(1)
  })
})
