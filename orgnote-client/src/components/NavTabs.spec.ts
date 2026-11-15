import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  NAV_TAB_ID_ATTRIBUTE,
  NAV_TAB_ID_SELECTOR,
  ORGNOTE_TAB_FORMAT,
} from 'src/constants/orgnote-tab';
import NavTab from './NavTab.vue';
import NavTabs from './NavTabs.vue';

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
});

test('NavTab exposes its tab identity to the scroll container', () => {
  const wrapper = mount(NavTab, { props: { paneId: 'pane', tabId: 'second' } });
  expect(wrapper.get('.tab').attributes(NAV_TAB_ID_ATTRIBUTE)).toBe('second');
});

test('NavTabs keeps actions in a dedicated non-scrolling section', () => {
  const wrapper = mount(NavTabs, {
    slots: { actions: '<button class="create-tab">Create tab</button>' },
  });
  expect(wrapper.get('.actions').find('.create-tab').exists()).toBe(true);
  expect(wrapper.get('.content').find('.create-tab').exists()).toBe(false);
});

test('NavTabs reveals a newly active tab with nearest scrolling', async () => {
  const tabs = ref(['first']);
  const activeTabId = ref('first');
  const wrapper = mount(
    defineComponent({
      components: { NavTabs },
      setup: () => ({ activeTabId, tabs, NAV_TAB_ID_ATTRIBUTE }),
      template: `
        <nav-tabs :active-tab-id="activeTabId">
          <div
            v-for="tab in tabs"
            :key="tab"
            v-bind="{ [NAV_TAB_ID_ATTRIBUTE]: tab }"
          >{{ tab }}</div>
        </nav-tabs>
      `,
    }),
  );
  await nextTick();
  scrollIntoView.mockClear();

  tabs.value = ['first', 'second'];
  activeTabId.value = 'second';
  await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());

  const secondTab = wrapper.findAll(NAV_TAB_ID_SELECTOR)[1]?.element;
  expect(scrollIntoView.mock.instances[0]).toBe(secondTab);
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
});

const TAB_WIDTH = 100;
const TAB_IDS = ['first', 'second', 'third'];
const OVERFLOW_TAB_IDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

const createRect = (left: number, width: number): DOMRect =>
  ({ left, width, right: left + width, top: 0, bottom: 30, height: 30, x: left, y: 0 }) as DOMRect;

const stubRect = (element: Element, rect: DOMRect): void => {
  Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: () => rect });
};

const stubScrollMetrics = (
  element: Element,
  metrics: { scrollLeft: number; clientWidth: number; scrollWidth: number },
): void => {
  Object.entries(metrics).forEach(([key, value]) =>
    Object.defineProperty(element, key, { configurable: true, writable: true, value }),
  );
};

const tabDataTransfer = { types: [ORGNOTE_TAB_FORMAT], dropEffect: 'none' };

const mountTabStrip = (tabDragActive = ref(true), tabIds = TAB_IDS) => {
  const wrapper = mount(
    defineComponent({
      components: { NavTabs },
      setup: () => ({ tabDragActive, tabIds, NAV_TAB_ID_ATTRIBUTE }),
      template: `
        <nav-tabs :tab-drag-active="tabDragActive" @tab-drop="$emit('tabDrop', $event)">
          <template #navigation><button class="history-back">Back</button></template>
          <div v-for="tab in tabIds" :key="tab" v-bind="{ [NAV_TAB_ID_ATTRIBUTE]: tab }">{{ tab }}</div>
        </nav-tabs>
      `,
      emits: ['tabDrop'],
    }),
  );
  wrapper.findAll(NAV_TAB_ID_SELECTOR).forEach((tab, index) =>
    stubRect(tab.element, createRect(index * TAB_WIDTH, TAB_WIDTH)),
  );
  const content = wrapper.get('.content').element;
  stubRect(content, createRect(0, TAB_WIDTH * TAB_IDS.length));
  stubScrollMetrics(content, { scrollLeft: 0, clientWidth: 300, scrollWidth: 300 });
  return { wrapper, content, tabDragActive };
};

const getIndicatorLeft = (wrapper: ReturnType<typeof mount>): string | undefined =>
  (wrapper.find('.drop-indicator').element as HTMLElement | undefined)?.style.left;

test('NavTabs emits the gap index of a tab dropped between tabs', async () => {
  const { wrapper } = mountTabStrip();

  await wrapper.get('.drop-area').trigger('drop', { clientX: 160, dataTransfer: tabDataTransfer });

  expect(wrapper.emitted('tabDrop')).toEqual([[{ gapIndex: 2 }]]);
});

test('NavTabs treats the trailing strip area as the last gap', async () => {
  const { wrapper } = mountTabStrip();

  await wrapper.get('.drop-area').trigger('drop', { clientX: 900, dataTransfer: tabDataTransfer });

  expect(wrapper.emitted('tabDrop')).toEqual([[{ gapIndex: TAB_IDS.length }]]);
});

test('NavTabs ignores drags that do not carry a tab', async () => {
  const { wrapper } = mountTabStrip();
  const fileTransfer = { types: ['Files'], dropEffect: 'none' };

  await wrapper.get('.drop-area').trigger('dragover', { clientX: 160, dataTransfer: fileTransfer });
  await wrapper.get('.drop-area').trigger('drop', { clientX: 160, dataTransfer: fileTransfer });

  expect(wrapper.find('.drop-indicator').exists()).toBe(false);
  expect(wrapper.emitted('tabDrop')).toBeUndefined();
});

test('NavTabs does not accept tab drags over the navigation buttons', async () => {
  const { wrapper } = mountTabStrip();

  await wrapper.get('.history-back').trigger('dragover', { clientX: 0, dataTransfer: tabDataTransfer });

  expect(wrapper.find('.drop-indicator').exists()).toBe(false);
});

test('NavTabs places the drop indicator in scrolled content coordinates', async () => {
  const { wrapper, content } = mountTabStrip();
  content.scrollLeft = 40;

  await wrapper.get('.drop-area').trigger('dragover', { clientX: 160, dataTransfer: tabDataTransfer });

  expect(getIndicatorLeft(wrapper)).toBe('240px');
});

test('NavTabs keeps the indicator while the drag moves between its children', async () => {
  const { wrapper } = mountTabStrip();
  await wrapper.get('.drop-area').trigger('dragover', { clientX: 160, dataTransfer: tabDataTransfer });
  const innerTab = wrapper.findAll(NAV_TAB_ID_SELECTOR)[0]?.element;

  await wrapper.get('.drop-area').trigger('dragleave', { relatedTarget: innerTab });

  expect(wrapper.find('.drop-indicator').exists()).toBe(true);
});

test('NavTabs clears the indicator when the drag leaves the window', async () => {
  const { wrapper } = mountTabStrip();
  await wrapper.get('.drop-area').trigger('dragover', { clientX: 160, dataTransfer: tabDataTransfer });

  await wrapper.get('.drop-area').trigger('dragleave', { relatedTarget: null });

  expect(wrapper.find('.drop-indicator').exists()).toBe(false);
});

test('NavTabs clears the indicator when the shared tab drag ends elsewhere', async () => {
  const { wrapper, tabDragActive } = mountTabStrip();
  await wrapper.get('.drop-area').trigger('dragover', { clientX: 160, dataTransfer: tabDataTransfer });

  tabDragActive.value = false;
  await nextTick();

  expect(wrapper.find('.drop-indicator').exists()).toBe(false);
});

test('NavTabs auto-scrolls an overflowing strip and recomputes the drop gap', async () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const { wrapper, content, tabDragActive } = mountTabStrip(ref(true), OVERFLOW_TAB_IDS);
  stubScrollMetrics(content, { scrollLeft: 0, clientWidth: 300, scrollWidth: 600 });
  wrapper.findAll(NAV_TAB_ID_SELECTOR).forEach((tab, index) =>
    Object.defineProperty(tab.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => createRect(index * TAB_WIDTH - content.scrollLeft, TAB_WIDTH),
    }),
  );
  stubRect(content, createRect(0, 300));

  await wrapper.get('.drop-area').trigger('dragover', { clientX: 295, dataTransfer: tabDataTransfer });
  const indicatorBeforeScroll = getIndicatorLeft(wrapper);
  Array.from({ length: 7 }).forEach(() => frames.shift()?.(0));
  await nextTick();
  const indicatorAfterScroll = getIndicatorLeft(wrapper);
  await wrapper.get('.drop-area').trigger('drop', { clientX: 295, dataTransfer: tabDataTransfer });
  tabDragActive.value = false;
  await nextTick();
  const scrolledLeft = content.scrollLeft;
  frames.shift()?.(0);

  expect(indicatorBeforeScroll).toBe('300px');
  expect(indicatorAfterScroll).toBe('400px');
  expect(wrapper.emitted('tabDrop')).toEqual([[{ gapIndex: 4 }]]);
  expect(content.scrollLeft).toBe(scrolledLeft);
  vi.unstubAllGlobals();
});

test('NavTabs does not schedule auto-scroll when the strip cannot scroll', async () => {
  const requestFrame = vi.fn();
  vi.stubGlobal('requestAnimationFrame', requestFrame);
  const { wrapper } = mountTabStrip();

  await wrapper.get('.drop-area').trigger('dragover', { clientX: 295, dataTransfer: tabDataTransfer });

  expect(requestFrame).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
