import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppProgress from './AppProgress.vue';

describe('AppProgress', () => {
  test('renders progress track and fill', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50 },
    });

    expect(wrapper.find('.app-progress-track').exists()).toBe(true);
    expect(wrapper.find('.app-progress-fill').exists()).toBe(true);
  });

  test('calculates correct fill width', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 75, max: 100 },
    });

    const fill = wrapper.find('.app-progress-fill');
    expect(fill.attributes('style')).toContain('width: 75%');
  });

  test('clamps value above max to 100%', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 150, max: 100 },
    });

    const fill = wrapper.find('.app-progress-fill');
    expect(fill.attributes('style')).toContain('width: 100%');
  });

  test('clamps negative value to 0%', () => {
    const wrapper = mount(AppProgress, {
      props: { value: -50, max: 100 },
    });

    const fill = wrapper.find('.app-progress-fill');
    expect(fill.attributes('style')).toContain('width: 0%');
  });

  test('applies size class to container', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50, size: 'lg' },
    });

    expect(wrapper.find('.app-progress-container').classes()).toContain('size-lg');
  });

  test('applies variant class to fill', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50, variant: 'danger' },
    });

    expect(wrapper.find('.app-progress-fill').classes()).toContain('variant-danger');
  });

  test('hides label by default', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50 },
    });

    expect(wrapper.find('.app-progress-header').exists()).toBe(false);
  });

  test('shows label when showLabel is true', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50, showLabel: true, label: 'Test' },
    });

    expect(wrapper.find('.app-progress-header').exists()).toBe(true);
    expect(wrapper.find('.app-progress-label').text()).toBe('Test');
  });

  test('formats value as percent by default', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50, showLabel: true },
    });

    expect(wrapper.find('.app-progress-value').text()).toBe('50.0%');
  });

  test('formats value as raw value', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 42, showLabel: true, labelFormat: 'value' },
    });

    expect(wrapper.find('.app-progress-value').text()).toBe('42');
  });

  test('formats value as fraction', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 30, max: 100, showLabel: true, labelFormat: 'fraction' },
    });

    expect(wrapper.find('.app-progress-value').text()).toBe('30 / 100');
  });

  test('autoVariant returns success for low values', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 20, autoVariant: true },
    });

    expect(wrapper.find('.app-progress-fill').classes()).toContain('variant-success');
  });

  test('autoVariant returns warning for medium values', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50, autoVariant: true },
    });

    expect(wrapper.find('.app-progress-fill').classes()).toContain('variant-warning');
  });

  test('autoVariant returns danger for high values', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 80, autoVariant: true },
    });

    expect(wrapper.find('.app-progress-fill').classes()).toContain('variant-danger');
  });

  test('works with custom max value', () => {
    const wrapper = mount(AppProgress, {
      props: { value: 50, max: 200, showLabel: true },
    });

    const fill = wrapper.find('.app-progress-fill');
    expect(fill.attributes('style')).toContain('width: 25%');
    expect(wrapper.find('.app-progress-value').text()).toBe('25.0%');
  });
});
