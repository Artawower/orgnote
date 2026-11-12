import { expect, test } from 'vitest';
import { parseToml } from '../../../utils/toml';
import { textToUint8Array, uint8ArrayToText } from '../../../utils/binary';
import { MergeOutcome } from '../../types';
import { mergeToml } from '../toml-merge';

const asBytes = (content: string): Uint8Array => textToUint8Array(content);

const asToml = (content: Uint8Array | undefined): Record<string, unknown> => {
  const parsed = parseToml(uint8ArrayToText(content ?? new Uint8Array()));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Expected a TOML table');
  }
  return parsed as Record<string, unknown>;
};

test('mergeToml preserves non-overlapping local and remote changes', () => {
  const result = mergeToml({
    base: asBytes('[network]\napiUrl = "old"\n\n[synchronization]\ntype = "none"\n'),
    local: asBytes('[network]\napiUrl = "correct"\n\n[synchronization]\ntype = "api"\n'),
    remote: asBytes('[network]\napiUrl = "old"\n\n[synchronization]\ntype = "none"\n\n[ui]\ntheme = "dark"\n'),
  });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  expect(asToml(result.mergedContent)).toEqual({
    network: { apiUrl: 'correct' },
    synchronization: { type: 'api' },
    ui: { theme: 'dark' },
  });
});

test('mergeToml reports concurrent changes to the same field as ambiguous', () => {
  const result = mergeToml({
    base: asBytes('[network]\napiUrl = "old"\n'),
    local: asBytes('[network]\napiUrl = "local"\n'),
    remote: asBytes('[network]\napiUrl = "remote"\n'),
  });

  expect(result.outcome).toBe(MergeOutcome.Ambiguous);
});

test('mergeToml merges independently added table fields', () => {
  const result = mergeToml({
    base: asBytes(''),
    local: asBytes('[extension]\nlocal = true\n'),
    remote: asBytes('[extension]\nremote = true\n'),
  });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  expect(asToml(result.mergedContent)).toEqual({
    extension: { local: true, remote: true },
  });
});

test('mergeToml rejects invalid TOML without throwing', () => {
  const result = mergeToml({
    base: asBytes('[system]\nlanguage = "en"\n'),
    local: asBytes('[system'),
    remote: asBytes('[system]\nlanguage = "de"\n'),
  });

  expect(result.outcome).toBe(MergeOutcome.Ambiguous);
});
