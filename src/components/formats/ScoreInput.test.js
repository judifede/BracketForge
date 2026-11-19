// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreInput from './ScoreInput.vue'

describe('ScoreInput', () => {
  it('emite apply-result al confirmar un marcador entero', async () => {
    const wrapper = mount(ScoreInput, {
      props: {
        matchId: 'rr-r0-m0',
        p1: 'Ana',
        p2: 'Bruno',
        score1: null,
        score2: null,
      },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('2')
    await inputs[0].trigger('change')

    expect(wrapper.emitted('apply-result')[0][0]).toEqual({
      matchId: 'rr-r0-m0',
      result: { a: 2, b: 0 },
    })
  })

  it('no emite si el campo queda vacío (restaura el valor previo)', async () => {
    const wrapper = mount(ScoreInput, {
      props: {
        matchId: 'rr-r0-m0',
        p1: 'Ana',
        p2: 'Bruno',
        score1: 1,
        score2: 0,
      },
    })

    const input = wrapper.findAll('input')[0]
    // setValue dispara change por su cuenta; aquí simulamos sólo el blur/change.
    input.element.value = ''
    await input.trigger('change')

    expect(wrapper.emitted('apply-result')).toBeUndefined()
    expect(input.element.value).toBe('1')
  })

  it('rechaza valores no enteros y restaura el marcador', async () => {
    const wrapper = mount(ScoreInput, {
      props: {
        matchId: 'rr-r0-m0',
        p1: 'Ana',
        p2: 'Bruno',
        score1: 3,
        score2: 1,
      },
    })

    const input = wrapper.findAll('input')[1]
    input.element.value = '1.5'
    await input.trigger('change')

    expect(wrapper.emitted('apply-result')).toBeUndefined()
    expect(input.element.value).toBe('1')
  })
})
