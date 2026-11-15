import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { usePrettyDate } from './use-pretty-date';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref('en-US'),
  }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 1, 22, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

test('usePrettyDate returns today key for current day', () => {
  const { prettyDate } = usePrettyDate();

  expect(prettyDate(new Date(2026, 1, 22, 1, 0, 0))).toBe('today');
});

test('usePrettyDate returns yesterday key for previous day', () => {
  const { prettyDate } = usePrettyDate();

  expect(prettyDate(new Date(2026, 1, 21, 18, 0, 0))).toBe('yesterday');
});

test('usePrettyDate returns locale date for older dates', () => {
  const { prettyDate } = usePrettyDate();
  const date = new Date(2026, 1, 20, 8, 0, 0);

  expect(prettyDate(date)).toBe(date.toLocaleDateString('en-US'));
});

test('usePrettyDate returns Invalid Date for invalid values', () => {
  const { prettyDate } = usePrettyDate();

  expect(prettyDate('invalid')).toBe('Invalid Date');
});
