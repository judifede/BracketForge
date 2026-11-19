// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Form from './Form.vue'
import { FORMATS } from '../../lib/formats/index.js'

describe('Init/Form', () => {
  it('lista los formatos del registro con sus opciones', () => {
    const wrapper = mount(Form)
    const options = wrapper.findAll('#format option')

    expect(options).toHaveLength(FORMATS.length)
    expect(options.map((option) => option.attributes('value'))).toEqual(
      FORMATS.map((format) => format.id)
    )
    // Los formatos aún no implementados aparecen deshabilitados.
    for (const option of options) {
      const format = FORMATS.find((f) => f.id === option.attributes('value'))
      expect(Boolean(option.attributes('disabled'))).toBe(!format.implemented)
    }
  })

  it('muestra las opciones del formato seleccionado', async () => {
    const wrapper = mount(Form)
    expect(wrapper.find('[data-tour="setup-options"]').exists()).toBe(false)

    // Doble eliminación ya no tiene opciones de setup.
    await wrapper.find('#format').setValue('d')
    expect(wrapper.find('[data-tour="setup-options"]').exists()).toBe(false)

    await wrapper.find('#format').setValue('r')
    expect(wrapper.find('[data-tour="setup-options"]').exists()).toBe(true)
    expect(wrapper.find('[data-tour="setup-options"]').text()).toContain(
      'Doble vuelta'
    )
  })

  it('aplica defaults al cambiar de formato y no marca doble vuelta', async () => {
    const wrapper = mount(Form)
    await wrapper.find('#format').setValue('r')
    await wrapper.vm.$nextTick()

    const checkbox = wrapper.find('[data-tour="setup-options"] input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    expect(checkbox.element.checked).toBe(false)

    const numberInputs = wrapper.findAll(
      '[data-tour="setup-options"] input[type="number"]'
    )
    expect(numberInputs.map((input) => Number(input.element.value))).toEqual([
      3, 1,
    ])
  })

  it('agrupa puntos victoria/empate en una fila de números', async () => {
    const wrapper = mount(Form)
    await wrapper.find('#format').setValue('r')
    await wrapper.vm.$nextTick()

    const numberRow = wrapper.find('.form-option-numbers')
    expect(numberRow.exists()).toBe(true)
    expect(numberRow.findAll('input[type="number"]')).toHaveLength(2)
    expect(numberRow.text()).toContain('Puntos por victoria')
    expect(numberRow.text()).toContain('Puntos por empate')
    // El checkbox booleano sigue fuera de esa fila.
    expect(numberRow.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('fusiona defaults al restaurar opciones incompletas', async () => {
    const wrapper = mount(Form, {
      props: {
        initial: {
          tournamentName: 'Copa',
          tournamentFormat: 'r',
          tournamentPlayers: ['Ana', 'Bruno', 'Carla', 'Dan'],
          tournamentOptions: { doubleRound: true },
        },
      },
    })
    await wrapper.vm.$nextTick()

    const checkbox = wrapper.find('[data-tour="setup-options"] input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(true)
    const numberInputs = wrapper.findAll(
      '[data-tour="setup-options"] input[type="number"]'
    )
    expect(numberInputs.map((input) => Number(input.element.value))).toEqual([
      3, 1,
    ])
  })

  it('un preset no cambia el formato elegido', async () => {
    const wrapper = mount(Form)
    await wrapper.find('#format').setValue('r')

    // "Esports" es el segundo chip de preset.
    const presets = wrapper.findAll('button.chip--preset')
    await presets[1].trigger('click')

    expect((wrapper.find('#format').element).value).toBe('r')
    // Y el nombre y los participantes sí se rellenan.
    expect((wrapper.find('#name').element).value).not.toBe('')
    expect(wrapper.text()).toContain('participantes')
  })

  it('el botón de crear se habilita con nombre y participantes válidos', async () => {
    const wrapper = mount(Form)
    const submitButton = () => wrapper.find('button[type="submit"]')
    expect(submitButton().element.disabled).toBe(true)

    await wrapper.find('#name').setValue('Copa Test')

    // Los participantes se teclean en casillas fijas (una por jugador).
    const slots = wrapper.findAll('.players-field input[type="text"]')
    await slots[0].setValue('Ana')
    await slots[1].setValue('Bruno')
    await slots[2].setValue('Carla')
    await wrapper.vm.$nextTick()

    expect(submitButton().element.disabled).toBe(false)
  })
})
