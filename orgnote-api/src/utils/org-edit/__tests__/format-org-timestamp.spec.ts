import { expect, test } from 'vitest';
import {
  formatInactiveTimestamp,
  formatOrgStamp,
} from '../shared/format-org-timestamp';

test('formatOrgStamp_formatsActiveDateOnly', () => {
  expect(
    formatOrgStamp(new Date(2026, 4, 13, 10, 53), {
      active: true,
      withTime: false,
    })
  ).toBe('<2026-05-13 Wed>');
});

test('formatOrgStamp_formatsActiveDateWithTimeAndDailyRepeater', () => {
  expect(
    formatOrgStamp(new Date(2026, 4, 13, 10, 53), {
      active: true,
      withTime: true,
      repeater: { type: '+', value: 1, unit: 'd' },
    })
  ).toBe('<2026-05-13 Wed 10:53 +1d>');
});

test('formatInactiveTimestamp_formatsInactiveTimestamp', () => {
  expect(formatInactiveTimestamp(new Date(2026, 4, 13, 10, 53))).toBe(
    '[2026-05-13 Wed 10:53]'
  );
});

test('formatOrgStamp_includesWarningSuffix_afterRepeater', () => {
  expect(
    formatOrgStamp(new Date(2026, 4, 13, 10, 53), {
      active: true,
      withTime: false,
      repeater: { type: '+', value: 1, unit: 'd' },
      warning: { type: '-', value: 2, unit: 'd' },
    })
  ).toBe('<2026-05-13 Wed +1d -2d>');
});
