import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import type * as VueI18n from 'vue-i18n';
import PropertyDateTimeValue from './PropertyDateTimeValue.vue';

vi.mock('vue-i18n', async () => {
  const actual = (await vi.importActual('vue-i18n')) as typeof VueI18n;

  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  };
});

const open = vi.fn();

const mountDateTimeValue = (readonly = false) =>
  mount(PropertyDateTimeValue, {
    props: {
      item: { key: 'created', value: '[2026-06-25 Thu]' },
      readonly,
    },
    global: {
      stubs: {
        DatePickerPopover: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: `
            <div>
              <slot name="trigger" :open="open" />
              <button class="select-date" @click="$emit('update:modelValue', '2026-06-26')" />
            </div>
          `,
          setup: () => ({ open }),
        },
      },
    },
  });

test('property date value opens date picker from the displayed date', async () => {
  open.mockClear();
  const wrapper = mountDateTimeValue();

  await wrapper.find('.inline-date-token').trigger('click');

  expect(open).toHaveBeenCalledOnce();
});

test('property date value ignores trigger clicks when readonly', async () => {
  open.mockClear();
  const wrapper = mountDateTimeValue(true);

  await wrapper.find('.inline-date-token').trigger('click');

  expect(open).not.toHaveBeenCalled();
});

test('property date value emits selected org date', async () => {
  const wrapper = mountDateTimeValue();

  await wrapper.find('.select-date').trigger('click');

  expect(wrapper.emitted('set')).toEqual([['[2026-06-26 Fri]']]);
});
