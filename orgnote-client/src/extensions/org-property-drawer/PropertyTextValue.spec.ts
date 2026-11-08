import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import PropertyTextValue from './PropertyTextValue.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

test('PropertyTextValue keeps Enter inside property editor', async () => {
  const bubbled = vi.fn();
  const wrapper = mount({
    components: { PropertyTextValue },
    template: '<div @keydown="bubbled"><property-text-value :item="item" /></div>',
    setup: () => ({
      bubbled,
      item: { key: 'ID', value: 'some-id' },
    }),
  });

  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  });
  wrapper.find('textarea').element.dispatchEvent(event);
  await wrapper.vm.$nextTick();

  expect(event.defaultPrevented).toBe(true);
  expect(bubbled).not.toHaveBeenCalled();
  const component = wrapper.findComponent(PropertyTextValue);
  expect(component.emitted('set')).toEqual([['some-id']]);
  expect(component.emitted('enter')).toEqual([[]]);
});

test('PropertyTextValue skips blur commit after Enter navigation', async () => {
  const wrapper = mount(PropertyTextValue, {
    props: {
      item: { key: 'ID', value: 'some-id' },
    },
  });

  const textarea = wrapper.find('textarea').element;
  textarea.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  );
  textarea.dispatchEvent(new FocusEvent('blur'));
  await wrapper.vm.$nextTick();

  expect(wrapper.emitted('set')).toEqual([['some-id']]);
  expect(wrapper.emitted('enter')).toEqual([[]]);
});
