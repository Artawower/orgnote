import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import { NAV_TAB_ID_ATTRIBUTE, NAV_TAB_ID_SELECTOR } from 'src/constants/orgnote-tab';
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
