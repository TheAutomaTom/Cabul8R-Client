import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DimensionInput from './DimensionInput.vue'
import { useSettings } from '../settings'

const IN = 25.4

describe('DimensionInput', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const setup = (modelValue?: number) =>
    mount(DimensionInput, {
      props: {
        modelValue,
        'onUpdate:modelValue': (v: number | undefined) => wrapper.setProps({ modelValue: v }),
      },
    })
  let wrapper: ReturnType<typeof setup>

  it('shows the stored millimeters in the display style', () => {
    wrapper = setup(15.5 * IN)
    expect(wrapper.find('input').element.value).toBe(`1'-3 1/2"`)
  })

  it('previews an expression and commits millimeters on Enter', async () => {
    wrapper = setup()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('1.1/8*3')
    expect(wrapper.find('.chip').text()).toBe(`= 3 3/8"`)
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.props('modelValue')).toBeCloseTo(3.375 * IN, 10)
    expect(input.element.value).toBe(`3 3/8"`)
  })

  it('shows an error and keeps the old value when input is invalid', async () => {
    wrapper = setup(IN)
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('1 + #')
    expect(wrapper.find('[role=alert]').text()).toBe('Unexpected "#"')
    await input.trigger('blur')
    expect(wrapper.props('modelValue')).toBe(IN)
    expect(input.element.value).toBe(`1"`)
  })

  it('nudges by 1/16" with the arrow keys', async () => {
    wrapper = setup(IN)
    await wrapper.find('input').trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.props('modelValue')).toBeCloseTo(IN * (1 + 1 / 16), 10)
  })

  it('redisplays when the unit system changes', async () => {
    wrapper = setup(1200)
    useSettings().toggleSystem()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('input').element.value).toBe('1200 mm')
  })
})

describe('DimensionInput submit', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('emits submit with the parsed value on Enter only', async () => {
    const w = mount(DimensionInput, { props: { modelValue: undefined } })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue(`16'`)
    await input.trigger('blur')
    expect(w.emitted('submit')).toBeUndefined()
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('submit')?.[0]).toEqual([16 * 304.8])
  })
})
