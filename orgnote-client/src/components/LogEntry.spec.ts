import { mount } from '@vue/test-utils';
import { test, expect, vi, beforeEach } from 'vitest';
import LogEntry from './LogEntry.vue';
import type { LogRecord } from 'orgnote-api';
import * as clipboard from 'src/utils/clipboard';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useNotifications: () => ({
        notify: vi.fn(),
      }),
    },
  },
}));

const mockTranslate = vi.fn((key: string) => key);

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: mockTranslate,
  }),
}));

const createMockLog = (overrides?: Partial<LogRecord>): LogRecord => ({
  ts: new Date('2024-01-15T10:30:00.000Z'),
  level: 'error',
  message: 'Test error message',
  ...overrides,
});

const mountLogEntry = (log: LogRecord, position = 1) =>
  mount(LogEntry, {
    props: { log, position },
  });

beforeEach(() => {
  mockTranslate.mockClear();
});

test('LogEntry displays position number', () => {
  const log = createMockLog();
  const wrapper = mountLogEntry(log, 5);

  expect(wrapper.find('.number').text()).toBe('[5]');
});

test('LogEntry displays formatted timestamp', () => {
  const log = createMockLog({ ts: new Date('2024-01-15T10:30:00.000Z') });
  const wrapper = mountLogEntry(log);

  const appDate = wrapper.findComponent({ name: 'AppDate' });
  expect(appDate.exists()).toBe(true);
  expect(appDate.props('date')).toEqual(log.ts);
});

test('LogEntry displays log level in uppercase', () => {
  const log = createMockLog({ level: 'warn' });
  const wrapper = mountLogEntry(log);

  const badge = wrapper.findComponent({ name: 'AppBadge' });
  expect(badge.text()).toBe('WARN');
});

test('LogEntry displays message', () => {
  const log = createMockLog({ message: 'Custom error message' });
  const wrapper = mountLogEntry(log);

  expect(wrapper.find('.message').text()).toContain('Custom error message');
});

test('LogEntry applies error class for error level', () => {
  const log = createMockLog({ level: 'error' });
  const wrapper = mountLogEntry(log);

  expect(wrapper.classes()).toContain('error');
});

test('LogEntry applies warn class for warn level', () => {
  const log = createMockLog({ level: 'warn' });
  const wrapper = mountLogEntry(log);

  expect(wrapper.classes()).toContain('warn');
});

test('LogEntry copies message to clipboard when no stack', async () => {
  const copyToClipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue();
  const log = createMockLog({ message: 'Test error', context: undefined });
  const wrapper = mountLogEntry(log);

  await wrapper.find('.log-entry').trigger('click');

  expect(copyToClipboardSpy).toHaveBeenCalled();
  const copiedText = copyToClipboardSpy.mock.calls[0]?.[0] as string;
  expect(copiedText).toContain('[1]');
  expect(copiedText).toContain('Test error');
});

test('LogEntry copies stack to clipboard when present', async () => {
  const copyToClipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue();
  const log = createMockLog({
    message: 'Test error',
    context: { stack: 'Error: Test error\n  at file.ts:42' },
  });
  const wrapper = mountLogEntry(log);

  await wrapper.find('.log-entry').trigger('click');

  expect(copyToClipboardSpy).toHaveBeenCalled();
  const copiedText = copyToClipboardSpy.mock.calls[0]?.[0] as string;
  expect(copiedText).toContain('[1]');
  expect(copiedText).toContain('Error: Test error\n  at file.ts:42');
});

test('LogEntry copies context as JSON', async () => {
  const copyToClipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue();
  const log = createMockLog({
    message: 'Test error',
    context: { userId: '123', action: 'delete' },
  });
  const wrapper = mountLogEntry(log);

  await wrapper.find('.log-entry').trigger('click');

  const copiedText = copyToClipboardSpy.mock.calls[0]?.[0] as string;
  expect(copiedText).toContain('Context:');
  expect(copiedText).toContain('"userId"');
  expect(copiedText).toContain('"123"');
  expect(copiedText).toContain('"action"');
  expect(copiedText).toContain('"delete"');
});

test('LogEntry hides header when minimal prop is true', () => {
  const log = createMockLog();
  const wrapper = mount(LogEntry, {
    props: { log, minimal: true },
  });

  expect(wrapper.find('.header').exists()).toBe(false);
});
