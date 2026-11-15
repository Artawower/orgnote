import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppNotification from './AppNotification.vue';

const mountNotification = (props = {}) =>
  mount(AppNotification, {
    props,
    global: {
      directives: {
        'html-safe': {
          mounted(el: HTMLElement, binding: { value: string }) {
            el.textContent = binding.value ?? '';
          },
          updated(el: HTMLElement, binding: { value: string }) {
            el.textContent = binding.value ?? '';
          },
        },
      },
      stubs: {
        AppFlex: {
          template: '<div class="app-flex"><slot /></div>',
          props: ['gap', 'alignCenter', 'column', 'start', 'alignStart'],
        },
        AppIcon: {
          template: '<span class="app-icon" :data-name="name" />',
          props: ['name', 'color', 'size'],
        },
        ActionButton: {
          template: '<button class="action-button" @click.stop="$emit(\'click\', $event)"><slot /></button>',
          props: ['icon', 'size'],
          emits: ['click'],
        },
      },
    },
  });

test('AppNotification uses type fallback icon', () => {
  const wrapper = mountNotification({ type: 'danger', message: 'Failed' });

  expect(wrapper.find('.app-icon').attributes('data-name')).toBe('error');
});

test('AppNotification disables fallback icon', () => {
  const wrapper = mountNotification({ type: 'danger', iconEnabled: false, message: 'Failed' });

  expect(wrapper.find('.app-icon').exists()).toBe(false);
});

test('AppNotification prefers explicit icon', () => {
  const wrapper = mountNotification({ type: 'danger', icon: 'sym_o_alarm', message: 'Alarm' });

  expect(wrapper.find('.app-icon').attributes('data-name')).toBe('sym_o_alarm');
});
