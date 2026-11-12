import { mount } from '@vue/test-utils';
import { test, expect, beforeEach, vi } from 'vitest';
import { useLogStore } from 'src/stores/log';
import { createPinia, setActivePinia } from 'pinia';
import PageWrapper from 'src/components/PageWrapper.vue';
import ContentFrame from 'src/components/ContentFrame.vue';
import SafeArea from 'src/components/SafeArea.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import ErrorPage from './ErrorPage.vue';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useNotifications: () => ({ notify: vi.fn() }),
    },
  },
}));

vi.mock('src/composables/useAppLogs', () => ({
  useAppLogs: () => ({ errorLogText: { __v_isRef: true, value: '' } }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
  setActivePinia(createPinia());
});

test('ErrorPage integration with LogStore works', () => {
  const logStore = useLogStore();

  logStore.addLog({
    ts: new Date('2024-01-15T10:30:00.000Z'),
    level: 'error',
    message: 'Test error',
    context: { stack: 'Error stack' },
  });

  const exported = logStore.exportAsText();

  expect(exported).toContain('Test error');
  expect(exported).toContain('Error stack');
  expect(logStore.getCountByLevel('error')).toBe(1);
});

test('ErrorPage separates the page, content, and action surfaces', () => {
  const wrapper = mount(ErrorPage, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        InfoCard: true,
        AppLogs: true,
        MenuItem: true,
      },
    },
  });

  expect(wrapper.getComponent(PageWrapper).classes()).toContain('error-page');
  expect(wrapper.getComponent(SafeArea).classes()).toContain('error-surface');
  const contentFrames = wrapper.findAllComponents(ContentFrame);
  expect(contentFrames).toHaveLength(2);
  expect(contentFrames[1]!.props()).toMatchObject({
    padding: true,
    fullHeight: true,
  });
  expect(wrapper.getComponent(MenuGroup).classes()).toContain('error-actions');
});
