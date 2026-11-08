import { expect, test } from 'vitest';
import clone from 'rfdc';
import { stringifyToml } from 'orgnote-api/utils';
import { DEFAULT_CONFIG } from 'src/constants/config';
import {
  InvalidOrgNoteConfigSchemaError,
  InvalidOrgNoteConfigTomlError,
  parseOrgNoteConfigToml,
} from './parse-orgnote-config-toml';

const cloneConfig = clone();

test('parseOrgNoteConfigToml parses a valid config.toml', () => {
  const expected = cloneConfig(DEFAULT_CONFIG);
  expected.system.language = 'ru-RU';
  const raw = stringifyToml(expected);

  const result = parseOrgNoteConfigToml(raw);

  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap().system.language).toBe('ru-RU');
});

test('parseOrgNoteConfigToml accepts configs without sidebar buffer following', () => {
  const legacyConfig = cloneConfig(DEFAULT_CONFIG);
  delete legacyConfig.ui.followActiveBufferInSidebar;

  const result = parseOrgNoteConfigToml(stringifyToml(legacyConfig));

  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap().ui.followActiveBufferInSidebar).toBeUndefined();
});

test('parseOrgNoteConfigToml returns SyntaxError for invalid TOML', () => {
  const result = parseOrgNoteConfigToml('invalid = [toml');

  expect(result.isErr()).toBe(true);
  expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidOrgNoteConfigTomlError);
});

test('parseOrgNoteConfigToml returns TypeError for invalid schema and sets errors', () => {
  const raw = 'system = { language = 123 }';

  const result = parseOrgNoteConfigToml(raw);

  expect(result.isErr()).toBe(true);
  const error = result._unsafeUnwrapErr();
  expect(error).toBeInstanceOf(InvalidOrgNoteConfigSchemaError);
  expect((error as InvalidOrgNoteConfigSchemaError).errors.length).toBeGreaterThan(0);
});
