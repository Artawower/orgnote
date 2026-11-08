import { mount } from '@vue/test-utils';
import AppFooter from './AppFooter.vue';
import { test, expect } from 'vitest';

test('AppFooter_default_rendersSlotContent', () => {
  const wrapper = mount(AppFooter, {
    slots: { default: '<button>Action</button>' },
  });
  expect(wrapper.find('button').text()).toBe('Action');
});

test('AppFooter_default_hasFooterWrapperAndFooterClasses', () => {
  const wrapper = mount(AppFooter);
  expect(wrapper.classes()).toContain('footer-wrapper');
  expect(wrapper.find('.footer').exists()).toBe(true);
});

test('AppFooter_default_centerJustifyContent', () => {
  const wrapper = mount(AppFooter);
  const footer = wrapper.find('.footer');
  expect(footer.attributes('style')).toContain('center');
});

test('AppFooter_justifyBetween_spaceBetweenJustifyContent', () => {
  const wrapper = mount(AppFooter, { props: { justify: 'between' } });
  const footer = wrapper.find('.footer');
  expect(footer.attributes('style')).toContain('space-between');
});

test('AppFooter_openTop_addsOpenTopClass', () => {
  const wrapper = mount(AppFooter, { props: { openTop: true } });
  expect(wrapper.find('.footer').classes()).toContain('open-top');
});

test('AppFooter_openBottom_addsOpenBottomClass', () => {
  const wrapper = mount(AppFooter, { props: { openBottom: true } });
  expect(wrapper.find('.footer').classes()).toContain('open-bottom');
});
