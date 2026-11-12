import { expect, test } from 'vitest';
import { isOrgNoteConfigPath } from '../config-path';

test.each([
  '/.orgnote/config.toml',
  '.orgnote/config.toml',
  '/vault/.orgnote/config.toml',
])('recognizes OrgNote config path: %s', (path) => {
  expect(isOrgNoteConfigPath(path)).toBe(true);
});

test.each([
  '/config.toml',
  '/.orgnote/config.toml.backup',
  '/.orgnote/config.toml/child',
  '/.orgnote/settings.toml',
  '/.ORGNOTE/config.toml',
])('rejects non-config path: %s', (path) => {
  expect(isOrgNoteConfigPath(path)).toBe(false);
});
