import { mount } from '@vue/test-utils';
import AppSpoiler from './AppSpoiler.vue';
import { test, expect, vi } from 'vitest';
import { nextTick } from 'vue';

vi.mock('src/stores/config', () => ({
  useConfigStore: vi.fn(() => ({
    config: { ui: { enableAnimations: false } },
  })),
}));

test('AppSpoiler collapses by default', () => {
  const wrapper = mount(AppSpoiler, {
    slots: { title: 'Title', body: 'Body' },
  });

  expect(wrapper.find('.spoiler-title').text()).toBe('Title');
  expect(wrapper.find('.spoiler-body').exists()).toBe(false);
});

test('AppSpoiler starts expanded when defaultExpanded is true', async () => {
  const wrapper = mount(AppSpoiler, {
    props: { defaultExpanded: true },
    slots: { title: 'Title', body: 'Body' },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);

  await wrapper.find('.spoiler-header').trigger('click');
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
});

test('AppSpoiler toggles on header click', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: { title: 'Title', body: 'Body' },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(false);

  await wrapper.find('.spoiler-header').trigger('click');
  await nextTick();
  expect(wrapper.find('.spoiler-body').exists()).toBe(true);

  await wrapper.find('.spoiler-header').trigger('click');
  await nextTick();
  expect(wrapper.find('.spoiler-body').exists()).toBe(false);
});

test('AppSpoiler emits update:modelValue on toggle', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: { title: 'Title', body: 'Body' },
  });

  await wrapper.find('.spoiler-header').trigger('click');
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);

  await wrapper.find('.spoiler-header').trigger('click');
  expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([false]);
});

test('AppSpoiler respects modelValue false', () => {
  const wrapper = mount(AppSpoiler, {
    props: { modelValue: false },
    slots: { title: 'Title', body: 'Body' },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(false);
});

test('AppSpoiler respects modelValue true', () => {
  const wrapper = mount(AppSpoiler, {
    props: { modelValue: true },
    slots: { title: 'Title', body: 'Body' },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
});

test('AppSpoiler rotates icon when expanded', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: { title: 'Title', body: 'Body' },
  });

  expect(wrapper.find('.spoiler-icon').classes()).not.toContain('rotated');

  await wrapper.find('.spoiler-header').trigger('click');
  await nextTick();
  expect(wrapper.find('.spoiler-icon').classes()).toContain('rotated');
});

test('AppSpoiler handles multiple rapid clicks', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: { title: 'Title', body: 'Body' },
  });

  await wrapper.find('.spoiler-header').trigger('click');
  await wrapper.find('.spoiler-header').trigger('click');
  await wrapper.find('.spoiler-header').trigger('click');

  expect(wrapper.emitted('update:modelValue')).toHaveLength(3);
  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
});

test('AppSpoiler uses defaultExpanded when modelValue is undefined', async () => {
  const wrapper = mount(AppSpoiler, {
    props: { defaultExpanded: true, modelValue: undefined },
    slots: { title: 'Title', body: 'Body' },
  });

  await wrapper.find('.spoiler-header').trigger('click');
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
});

test('AppSpoiler renders actions next to the expand icon without toggling', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Title',
      actions: '<button class="test-action">Action</button>',
      body: 'Body',
    },
  });

  expect(wrapper.find('.spoiler-actions').exists()).toBe(true);
  await wrapper.find('.test-action').trigger('click');

  expect(wrapper.find('.spoiler-body').exists()).toBe(false);
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
});

test('AppSpoiler keeps large body content mounted for instant toggles', async () => {
  const wrapper = mount(AppSpoiler, {
    props: { keepMounted: true },
    slots: { title: 'Title', body: '<div class="large-body">Body</div>' },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
  expect(wrapper.find('.spoiler-body').attributes()).toHaveProperty('hidden');

  await wrapper.find('.spoiler-header').trigger('click');
  expect(wrapper.find('.spoiler-body').attributes()).not.toHaveProperty('hidden');

  await wrapper.find('.spoiler-header').trigger('click');
  expect(wrapper.find('.spoiler-body').attributes()).toHaveProperty('hidden');
});

test('AppSpoiler menu variant uses AppFlex and owns its scroll contract', () => {
  const wrapper = mount(AppSpoiler, {
    props: { variant: 'menu', scrollable: true, defaultExpanded: true },
    slots: { title: 'Files', body: 'Body' },
  });

  expect(wrapper.classes()).toEqual(
    expect.arrayContaining(['flex-container', 'variant-menu', 'scrollable', 'd-column']),
  );
});

test('AppSpoiler renders body content when expanded', () => {
  const wrapper = mount(AppSpoiler, {
    props: { defaultExpanded: true },
    slots: { title: 'Title', body: 'Body' },
  });

  expect(wrapper.find('.spoiler-body').text()).toBe('Body');
});

test('AppSpoiler renders expand icon with correct props', () => {
  const wrapper = mount(AppSpoiler, {
    slots: { title: 'Title', body: 'Body' },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.exists()).toBe(true);
  expect(icon.props('name')).toBe('sym_o_expand_more');
  expect(icon.props('size')).toBe('sm');
  expect(icon.props('color')).toBe('fg-muted');
});

test('AppSpoiler uses CardWrapper with plain type', () => {
  const wrapper = mount(AppSpoiler, {
    slots: { title: 'Title', body: 'Body' },
  });

  const cardWrapper = wrapper.findComponent({ name: 'CardWrapper' });
  expect(cardWrapper.exists()).toBe(true);
  expect(cardWrapper.props('type')).toBe('plain');
});
