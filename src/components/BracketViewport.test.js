// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketViewport from './BracketViewport.vue'

describe('BracketViewport', () => {
  it('libera el pointer capture al soltar sin lanzar (event.pointerId)', async () => {
    const wrapper = mount(BracketViewport, {
      props: { width: 800, height: 600 },
      slots: { default: '<div class="slot-rect" style="width:40px;height:40px"></div>' },
      attachTo: document.body,
    })

    const scroller = wrapper.find('[data-tour="bracket-viewport"] .bracket-scroll')
    const el = scroller.element

    el.setPointerCapture = () => {}
    let releasedId = null
    el.releasePointerCapture = (id) => {
      releasedId = id
    }

    await scroller.trigger('pointerdown', {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 7,
    })
    expect(wrapper.find('.bracket-scroll.is-panning').exists()).toBe(true)

    await scroller.trigger('pointerup', { pointerId: 7 })
    expect(wrapper.find('.bracket-scroll.is-panning').exists()).toBe(false)
    expect(releasedId).toBe(7)

    wrapper.unmount()
  })

  it('no inicia pan al pointerdown sobre un slot seleccionable', async () => {
    const wrapper = mount(BracketViewport, {
      props: { width: 400, height: 300 },
      attachTo: document.body,
      slots: {
        default:
          '<button type="button" class="slot-selectable">pick</button>',
      },
    })

    const slot = wrapper.find('.slot-selectable').element
    slot.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 5,
        clientY: 5,
        pointerId: 1,
      })
    )

    expect(wrapper.find('.bracket-scroll.is-panning').exists()).toBe(false)
    wrapper.unmount()
  })

  it('el chrome de zoom no tapa clics: wrapper pointer-events-none, controles auto', () => {
    const wrapper = mount(BracketViewport, {
      props: { width: 400, height: 300 },
    })

    const chrome = wrapper.find('.absolute.right-8.bottom-8')
    const zoom = wrapper.find('[data-tour="bracket-zoom"]')

    expect(chrome.classes()).toContain('pointer-events-none')
    expect(zoom.classes()).toContain('pointer-events-auto')
  })

  /**
   * happy-dom no layout-ea overflow real; stub métricas de scroll.
   * @param {HTMLElement} el
   * @param {{ scrollTop?: number, scrollLeft?: number, clientHeight?: number, scrollHeight?: number, clientWidth?: number, scrollWidth?: number }} metrics
   */
  function stubScrollMetrics(el, metrics) {
    let scrollTop = metrics.scrollTop ?? 0
    let scrollLeft = metrics.scrollLeft ?? 0
    Object.defineProperties(el, {
      clientHeight: { configurable: true, get: () => metrics.clientHeight ?? 200 },
      scrollHeight: { configurable: true, get: () => metrics.scrollHeight ?? 200 },
      clientWidth: { configurable: true, get: () => metrics.clientWidth ?? 300 },
      scrollWidth: { configurable: true, get: () => metrics.scrollWidth ?? 300 },
      scrollTop: {
        configurable: true,
        get: () => scrollTop,
        set: (v) => {
          scrollTop = v
        },
      },
      scrollLeft: {
        configurable: true,
        get: () => scrollLeft,
        set: (v) => {
          scrollLeft = v
        },
      },
    })
  }

  it('consume la rueda cuando el bracket aún puede scrollear', async () => {
    const wrapper = mount(BracketViewport, {
      props: { width: 800, height: 600 },
      attachTo: document.body,
    })
    const scroller = wrapper.find('.bracket-scroll')
    const el = scroller.element
    stubScrollMetrics(el, {
      scrollTop: 40,
      clientHeight: 200,
      scrollHeight: 600,
    })

    const event = new WheelEvent('wheel', {
      deltaY: 30,
      bubbles: true,
      cancelable: true,
    })
    el.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(el.scrollTop).toBe(70)
    wrapper.unmount()
  })

  it('no consume la rueda en el borde inferior para encadenar al navegador', async () => {
    const wrapper = mount(BracketViewport, {
      props: { width: 800, height: 600 },
      attachTo: document.body,
    })
    const scroller = wrapper.find('.bracket-scroll')
    const el = scroller.element
    stubScrollMetrics(el, {
      scrollTop: 400,
      clientHeight: 200,
      scrollHeight: 600,
    })

    const event = new WheelEvent('wheel', {
      deltaY: 40,
      bubbles: true,
      cancelable: true,
    })
    el.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(el.scrollTop).toBe(400)
    wrapper.unmount()
  })

  it('no consume la rueda si no hay overflow', async () => {
    const wrapper = mount(BracketViewport, {
      props: { width: 400, height: 300 },
      attachTo: document.body,
    })
    const scroller = wrapper.find('.bracket-scroll')
    const el = scroller.element
    stubScrollMetrics(el, {
      scrollTop: 0,
      clientHeight: 300,
      scrollHeight: 300,
    })

    const event = new WheelEvent('wheel', {
      deltaY: 20,
      bubbles: true,
      cancelable: true,
    })
    el.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    wrapper.unmount()
  })
})
