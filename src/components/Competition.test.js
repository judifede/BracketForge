// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Competition from './Competition.vue'
import { getFormat } from '../lib/formats/index.js'

const players = ['Ana', 'Bruno', 'Carla', 'Dan', 'Elena', 'Felix', 'Gema', 'Hugo']

/**
 * @param {string} formatId
 */
function mountFor(formatId) {
  const format = getFormat(formatId)
  return mount(Competition, {
    props: {
      competitionData: {
        tournamentName: 'Copa Test',
        tournamentFormat: formatId,
        tournamentPlayers: players,
        tournamentOptions: { ...format.defaultOptions },
      },
    },
  })
}

describe('Competition', () => {
  it('muestra el nombre y el formato del torneo', () => {
    const wrapper = mountFor('e')
    expect(wrapper.text()).toContain('Copa Test')
    expect(wrapper.text()).toContain('Eliminación simple')
    expect(wrapper.find('[data-tour="competition-format-info"]').exists()).toBe(
      true
    )
  })

  it('abre el modal de info del formato', async () => {
    const wrapper = mountFor('e')
    await wrapper.find('[data-tour="competition-format-info"]').trigger('click')
    expect(wrapper.text()).toContain('pierdes una vez')
  })

  it('resuelve la vista según el formato', () => {
    expect(mountFor('e').find('svg.bracket-svg').exists()).toBe(true)
    expect(mountFor('d').find('svg.bracket-svg').exists()).toBe(true)
    // Round robin y suizo son vistas de tabla, no de árbol SVG.
    expect(mountFor('r').find('table').exists()).toBe(true)
    expect(mountFor('s').find('table').exists()).toBe(true)
  })

  it('el botón de reordenar usa el texto del formato', () => {
    expect(mountFor('e').text()).toContain('Reordenar')
    expect(mountFor('r').text()).toContain('Reiniciar resultados')
    expect(mountFor('s').text()).toContain('Reiniciar torneo')
  })
})
