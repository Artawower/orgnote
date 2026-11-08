import { expect, test } from 'vitest';
import { parseQuickAddInput } from './parse-quick-add-input';

test('parseQuickAddInput_returnsTitle_whenNoSpecialSyntax', () => {
  const result = parseQuickAddInput('buy milk', []);
  expect(result).toEqual({ title: 'buy milk' });
});

test('parseQuickAddInput_resolvesTargetFile_fromKnownFiles', () => {
  const result = parseQuickAddInput('buy milk ~projects', ['projects.org']);
  expect(result).toEqual({ title: 'buy milk', targetFile: 'projects.org' });
});

test('parseQuickAddInput_leavesUnknownTilde_inTitle', () => {
  const result = parseQuickAddInput('buy ~unknown milk', ['projects.org']);
  expect(result).toEqual({ title: 'buy ~unknown milk' });
});

test('parseQuickAddInput_extractsBody_fromMultilineInput', () => {
  const result = parseQuickAddInput('title\ndescription', []);
  expect(result).toEqual({ title: 'title', body: 'description' });
});

test('parseQuickAddInput_trimsTitle', () => {
  const result = parseQuickAddInput('  spaces  ', []);
  expect(result).toEqual({ title: 'spaces' });
});

test('parseQuickAddInput_matchesFile_withFullPath', () => {
  const result = parseQuickAddInput('task ~inbox', ['/notes/inbox.org']);
  expect(result).toEqual({ title: 'task', targetFile: '/notes/inbox.org' });
});

test('parseQuickAddInput_ignoresBody_ifEmpty', () => {
  const result = parseQuickAddInput('title\n   ', []);
  expect(result).toEqual({ title: 'title' });
});

test('parseQuickAddInput_returnsEmptyTitle_forWhitespaceOnly', () => {
  const result = parseQuickAddInput('   ', []);
  expect(result).toEqual({ title: '' });
});

test('parseQuickAddInput_returnsEmptyTitle_forOnlyTargetSyntax', () => {
  const result = parseQuickAddInput('~projects', ['projects.org']);
  expect(result.title).toBe('');
  expect(result.targetFile).toBe('projects.org');
});

test('parseQuickAddInput_keepsOrgTagSyntax_inTitle', () => {
  const result = parseQuickAddInput('buy milk :work:', []);
  expect(result).toEqual({ title: 'buy milk :work:' });
});

test('parseQuickAddInput_keepsMultipleTags_inTitle', () => {
  const result = parseQuickAddInput('task :work::home:', []);
  expect(result).toEqual({ title: 'task :work::home:' });
});

test('parseQuickAddInput_keepsTagsAndResolvesTargetFile', () => {
  const result = parseQuickAddInput('task :work: ~projects', ['projects.org']);
  expect(result).toEqual({ title: 'task :work:', targetFile: 'projects.org' });
});
