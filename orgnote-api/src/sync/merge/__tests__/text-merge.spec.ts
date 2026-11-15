import { expect, test } from 'vitest';
import { textToUint8Array } from '../../../utils/binary';
import { mergeText } from '../text-merge';
import { MergeOutcome } from '../../types';

const enc = (s: string) => textToUint8Array(s);

test('returns remote when base is empty and local is empty', () => {
  const result = mergeText({
    base: new Uint8Array(0),
    local: new Uint8Array(0),
    remote: enc('remote text'),
  });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  expect(new TextDecoder().decode(result.mergedContent!)).toBe('remote text');
});

test('returns local when base is empty and remote is empty', () => {
  const result = mergeText({
    base: new Uint8Array(0),
    local: enc('local text'),
    remote: new Uint8Array(0),
  });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  expect(new TextDecoder().decode(result.mergedContent!)).toBe('local text');
});

test('returns remote when local equals base', () => {
  const base = enc('* TODO Task one\n');
  const result = mergeText({
    base,
    local: base,
    remote: enc('* DONE Task one\n'),
  });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  expect(new TextDecoder().decode(result.mergedContent!)).toBe(
    '* DONE Task one\n'
  );
});

test('returns local when remote equals base', () => {
  const base = enc('* TODO Task one\n');
  const result = mergeText({
    base,
    local: enc('* TODO Task one\n** Subtask\n'),
    remote: base,
  });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  expect(new TextDecoder().decode(result.mergedContent!)).toBe(
    '* TODO Task one\n** Subtask\n'
  );
});

test('returns local when all three are identical', () => {
  const content = enc('* Same content\n');
  const result = mergeText({ base: content, local: content, remote: content });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  expect(new TextDecoder().decode(result.mergedContent!)).toBe(
    '* Same content\n'
  );
});

test('merges non-overlapping edits from local and remote', () => {
  const base = enc('* TODO Task one\n* TODO Task two\n');
  const local = enc('* DONE Task one\n* TODO Task two\n');
  const remote = enc('* TODO Task one\n* DONE Task two\n');

  const result = mergeText({ base, local, remote });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  const merged = new TextDecoder().decode(result.mergedContent!);
  expect(merged).toContain('DONE Task one');
  expect(merged).toContain('DONE Task two');
});

test('diff-match-patch returns ambiguous for overlapping changes on same region', () => {
  const base = enc('* TODO Task one\n');
  const local = enc('* DONE Task one\n');
  const remote = enc('* CANCELLED Task one\n');

  const result = mergeText({ base, local, remote });

  expect(result.outcome).toBe(MergeOutcome.Ambiguous);
  expect(result.mergedContent).toBeUndefined();
});

test('merges insertion at different positions', () => {
  const base = enc('* A\n');
  const local = enc('* A\n* B\n');
  const remote = enc('* A\n* C\n');

  const result = mergeText({ base, local, remote });

  expect(result.outcome).toBe(MergeOutcome.Merged);
  const merged = new TextDecoder().decode(result.mergedContent!);
  expect(merged).toContain('* B');
  expect(merged).toContain('* C');
});

test('handles empty string content', () => {
  const result = mergeText({
    base: enc(''),
    local: enc(''),
    remote: enc(''),
  });

  expect(result.outcome).toBe(MergeOutcome.Merged);
});
