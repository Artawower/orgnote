import { mount } from '@vue/test-utils';
import { expect, test, describe } from 'vitest';
import AppFlex from './AppFlex.vue';

const createWrapper = (
  props: Record<string, unknown> = {},
  slots = { default: '<div>Content</div>' },
) =>
  mount(AppFlex, {
    props,
    slots,
  });

const getExposed = (wrapper: ReturnType<typeof createWrapper>) => {
  return wrapper.vm as unknown as {
    computedDirection: string;
    computedJustify: string;
    computedAlign: string;
    $el: HTMLElement | null;
  };
};

describe('AppFlex', () => {
  test('renders slot content', () => {
    const wrapper = createWrapper();
    expect(wrapper.text()).toBe('Content');
  });

  test('renders with flex class', () => {
    const wrapper = createWrapper();
    expect(wrapper.classes()).toContain('flex-container');
  });

  test('has correct default classes', () => {
    const wrapper = createWrapper();
    expect(wrapper.classes()).toContain('d-row');
    expect(wrapper.classes()).toContain('j-between');
    expect(wrapper.classes()).toContain('a-center');
  });

  test('direction column adds d-column class', () => {
    const wrapper = createWrapper({ direction: 'column' });
    expect(wrapper.classes()).toContain('d-column');
  });

  test('justify start adds j-start class', () => {
    const wrapper = createWrapper({ justify: 'start' });
    expect(wrapper.classes()).toContain('j-start');
  });

  test('justify center adds j-center class', () => {
    const wrapper = createWrapper({ justify: 'center' });
    expect(wrapper.classes()).toContain('j-center');
  });

  test('align start adds a-start class', () => {
    const wrapper = createWrapper({ align: 'start' });
    expect(wrapper.classes()).toContain('a-start');
  });

  test('align stretch adds a-stretch class', () => {
    const wrapper = createWrapper({ align: 'stretch' });
    expect(wrapper.classes()).toContain('a-stretch');
  });

  test('gap md adds gap-md class', () => {
    const wrapper = createWrapper({ gap: 'md' });
    expect(wrapper.classes()).toContain('gap-md');
  });

  test('custom gap adds inline style', () => {
    const wrapper = createWrapper({ gap: '20px' });
    expect(wrapper.attributes('style')).toContain('gap: 20px');
  });

  test('inline prop adds inline class', () => {
    const wrapper = createWrapper({ inline: true });
    expect(wrapper.classes()).toContain('inline');
  });

  test('column shortcut sets d-column', () => {
    const wrapper = createWrapper({ column: true });
    expect(wrapper.classes()).toContain('d-column');
  });

  test('row shortcut sets d-row', () => {
    const wrapper = createWrapper({ row: true });
    expect(wrapper.classes()).toContain('d-row');
  });

  test('start shortcut sets j-start', () => {
    const wrapper = createWrapper({ start: true });
    expect(wrapper.classes()).toContain('j-start');
  });

  test('center shortcut sets j-center', () => {
    const wrapper = createWrapper({ center: true });
    expect(wrapper.classes()).toContain('j-center');
  });

  test('between shortcut sets j-between', () => {
    const wrapper = createWrapper({ between: true });
    expect(wrapper.classes()).toContain('j-between');
  });

  test('alignStart shortcut sets a-start', () => {
    const wrapper = createWrapper({ alignStart: true });
    expect(wrapper.classes()).toContain('a-start');
  });

  test('alignCenter shortcut sets a-center', () => {
    const wrapper = createWrapper({ alignCenter: true });
    expect(wrapper.classes()).toContain('a-center');
  });

  test('alignStretch shortcut sets a-stretch', () => {
    const wrapper = createWrapper({ alignStretch: true });
    expect(wrapper.classes()).toContain('a-stretch');
  });

  test('column shortcut overrides direction prop', () => {
    const wrapper = createWrapper({ direction: 'row', column: true });
    expect(wrapper.classes()).toContain('d-column');
  });

  test('custom tag renders correctly', () => {
    const wrapper = createWrapper({ tag: 'section' });
    expect(wrapper.find('section.flex-container').exists()).toBe(true);
  });

  test('exposes $el as HTMLElement', () => {
    const wrapper = createWrapper();
    const exposed = getExposed(wrapper);
    expect(exposed.$el).toBeInstanceOf(HTMLElement);
    expect(exposed.$el?.classList.contains('flex-container')).toBe(true);
  });

  test('complex combination works', () => {
    const wrapper = createWrapper({
      column: true,
      start: true,
      alignStretch: true,
      gap: 'md',
    });
    expect(wrapper.classes()).toContain('d-column');
    expect(wrapper.classes()).toContain('j-start');
    expect(wrapper.classes()).toContain('a-stretch');
    expect(wrapper.classes()).toContain('gap-md');
  });

  test('reverse with column', () => {
    const wrapper = createWrapper({ column: true, reverse: true });
    expect(wrapper.classes()).toContain('d-column-reverse');
  });

  test('columnReverse shortcut', () => {
    const wrapper = createWrapper({ columnReverse: true });
    expect(wrapper.classes()).toContain('d-column-reverse');
  });

  test('rowReverse shortcut', () => {
    const wrapper = createWrapper({ rowReverse: true });
    expect(wrapper.classes()).toContain('d-row-reverse');
  });
});
