import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import AppVirtualList from './AppVirtualList.vue';
import type { AppVirtualListExpose } from './app-virtual-list.types';

const VIEWPORT_HEIGHT = 200;
const ITEM_HEIGHT = 20;

const items = Array.from({ length: 1000 }, (_, index) => `Item ${index}`);

const SIZE_PROPERTIES = ['clientHeight', 'offsetHeight', 'scrollHeight'] as const;

const originalSizes = SIZE_PROPERTIES.map(
  (property) => [property, Object.getOwnPropertyDescriptor(HTMLElement.prototype, property)] as const,
);

const SCROLL_HOST_CLASS = 'scroll-host';

const isViewport = (element: HTMLElement): boolean =>
  element.classList.contains(SCROLL_HOST_CLASS) ||
  (element.classList.contains('app-virtual-list') && !element.closest(`.${SCROLL_HOST_CLASS}`));

const SIZE_RESOLVERS: Record<(typeof SIZE_PROPERTIES)[number], (element: HTMLElement) => number> = {
  clientHeight: (element) => (isViewport(element) ? VIEWPORT_HEIGHT : ITEM_HEIGHT),
  offsetHeight: (element) => (isViewport(element) ? VIEWPORT_HEIGHT : ITEM_HEIGHT),
  scrollHeight: (element) => (isViewport(element) ? items.length * ITEM_HEIGHT : ITEM_HEIGHT),
};

beforeEach(() => {
  SIZE_PROPERTIES.forEach((property) =>
    Object.defineProperty(HTMLElement.prototype, property, {
      configurable: true,
      get() {
        return SIZE_RESOLVERS[property](this);
      },
    }),
  );
});

afterEach(() => {
  originalSizes.forEach(([property, descriptor]) => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, property, descriptor);
  });
});

const mountList = (props: Record<string, unknown> = {}) =>
  mount(AppVirtualList, {
    props: { items, itemSize: ITEM_HEIGHT, ...props },
    slots: {
      default: ({ item, index }: { item: unknown; index: number }) =>
        h('div', { class: 'row', 'data-index': index }, item === undefined ? '' : String(item)),
    },
    attachTo: document.body,
  });

const renderedRows = (wrapper: ReturnType<typeof mountList>) => wrapper.findAll('.row');

test('AppVirtualList renders only the rows around the viewport', async () => {
  const wrapper = mountList();
  await nextTick();

  const rows = renderedRows(wrapper);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThan(50);
  expect(rows[0]?.text()).toBe('Item 0');
  wrapper.unmount();
});

test('AppVirtualList renders rows by index when only a count is given', async () => {
  const wrapper = mountList({ items: undefined, count: 1000 });
  await nextTick();

  const firstRow = renderedRows(wrapper)[0];
  expect(firstRow?.attributes('data-index')).toBe('0');
  expect(firstRow?.text()).toBe('');
  wrapper.unmount();
});

test('AppVirtualList reports the visible range', async () => {
  const wrapper = mountList();
  await nextTick();

  expect(wrapper.emitted('range')?.at(-1)).toEqual([
    { start: 0, end: VIEWPORT_HEIGHT / ITEM_HEIGHT - 1 },
  ]);
  wrapper.unmount();
});

test('AppVirtualList scrolls a row to the requested edge', async () => {
  const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {});
  const wrapper = mountList();
  await nextTick();

  (wrapper.vm as unknown as AppVirtualListExpose).scrollToIndex(100, 'start');

  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 100 * ITEM_HEIGHT }));
  scrollTo.mockRestore();
  wrapper.unmount();
});

test('AppVirtualList can virtualize inside a scrolling ancestor', async () => {
  const host = document.createElement('div');
  host.className = SCROLL_HOST_CLASS;
  host.style.overflowY = 'auto';
  document.body.append(host);
  const wrapper = mount(AppVirtualList, {
    props: { items, itemSize: ITEM_HEIGHT, scrollParent: true },
    slots: { default: ({ index }: { index: number }) => h('div', { class: 'row' }, String(index)) },
    attachTo: host,
  });
  await nextTick();

  expect(wrapper.emitted('range')?.at(-1)).toEqual([
    { start: 0, end: VIEWPORT_HEIGHT / ITEM_HEIGHT - 1 },
  ]);
  expect(wrapper.findAll('.row').length).toBeLessThan(50);
  wrapper.unmount();
  host.remove();
});

const VISIBLE_ROW_COUNT = VIEWPORT_HEIGHT / ITEM_HEIGHT;

test('AppVirtualList reports the new visible range when the count grows', async () => {
  const wrapper = mountList({ items: undefined, count: 2 });
  await nextTick();

  await wrapper.setProps({ count: 100 });
  await nextTick();

  expect(wrapper.emitted('range')?.at(-1)).toEqual([{ start: 0, end: VISIBLE_ROW_COUNT - 1 }]);
  wrapper.unmount();
});

test('AppVirtualList reports a range when an empty list gets rows', async () => {
  const wrapper = mountList({ items: undefined, count: 0 });
  await nextTick();

  await wrapper.setProps({ count: 100 });
  await nextTick();

  expect(wrapper.emitted('range')?.at(-1)).toEqual([{ start: 0, end: VISIBLE_ROW_COUNT - 1 }]);
  wrapper.unmount();
});

test('AppVirtualList reports the shrunk range when the count drops', async () => {
  const wrapper = mountList({ items: undefined, count: 100 });
  await nextTick();

  await wrapper.setProps({ count: 3 });
  await nextTick();

  expect(wrapper.emitted('range')?.at(-1)).toEqual([{ start: 0, end: 2 }]);
  wrapper.unmount();
});

const StatefulRow = defineComponent({
  props: { label: { type: String, required: true } },
  setup(props) {
    const createdFor = props.label;
    return () => h('div', { class: 'stateful-row' }, `${props.label}:${createdFor}`);
  },
});

test('AppVirtualList keeps row state with its key when items are reordered', async () => {
  const wrapper = mount(AppVirtualList, {
    props: { items: ['a', 'b'], itemSize: ITEM_HEIGHT, itemKey: (item: unknown) => String(item) },
    slots: { default: ({ item }: { item: unknown }) => h(StatefulRow, { label: String(item) }) },
    attachTo: document.body,
  });
  await nextTick();

  await wrapper.setProps({ items: ['b', 'a'] });
  await nextTick();

  expect(wrapper.findAll('.stateful-row').map((row) => row.text())).toEqual(['b:b', 'a:a']);
  wrapper.unmount();
});
