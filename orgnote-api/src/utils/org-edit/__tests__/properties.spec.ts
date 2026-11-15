import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('rootProperties_readsDrawerBeforeFirstHeadline_afterKeywords', () => {
  const content = '#+title: X\n:PROPERTIES:\n:source: one\n:tags: :a:b:\n:type: note\n:END:\n\n* H\n';
  let entries: Readonly<Record<string, string>> = {};
  editOrgDocument(content, (doc) => {
    entries = doc.properties.entries;
  });
  expect(entries).toEqual({ source: 'one', tags: ':a:b:', type: 'note' });
});

test('rootProperties_createsEmptyDrawerAtFileStart', () => {
  const content = '#+title: X\n\n* H\n';
  const result = editOrgDocument(content, (doc) => {
    doc.properties.ensure();
  });
  expect(result).toBe(':PROPERTIES:\n:END:\n#+title: X\n\n* H\n');
});

test('rootProperties_updatesExistingDrawerInPlace', () => {
  const content = '#+title: X\n:PROPERTIES:\n:source: one\n:END:\n\n* H\n';
  const result = editOrgDocument(content, (doc) => {
    doc.properties.set('type', 'video');
  });
  expect(result).toBe('#+title: X\n:PROPERTIES:\n:source: one\n:type: video\n:END:\n\n* H\n');
});

test('headlineProperties_supportsAddRenameRemove', () => {
  const content = '* H\n:PROPERTIES:\n:source: one\n:END:\nBody\n';
  const result = editOrgDocument(content, (doc) => {
    const headline = doc.headlineAt(0)!;
    headline.properties.set('type', 'video');
    headline.properties.rename('source', 'url');
    headline.properties.remove('type');
  });
  expect(result).toBe('* H\n:PROPERTIES:\n:url: one\n:END:\nBody\n');
});

test('properties_normalizesDuplicateKeysWithLastValue', () => {
  const content = '* H\n:PROPERTIES:\n:source: one\n:source: two\n:END:\n';
  let items: readonly { key: string; value: string }[] = [];
  const result = editOrgDocument(content, (doc) => {
    const headline = doc.headlineAt(0)!;
    items = headline.properties.items;
    headline.properties.set('type', 'note');
  });
  expect(items).toEqual([{ key: 'source', value: 'two' }]);
  expect(result).toBe('* H\n:PROPERTIES:\n:source: two\n:type: note\n:END:\n');
});

test('properties_rejectsInvalidKeysAndMultilineValues', () => {
  const content = '* H\n';
  editOrgDocument(content, (doc) => {
    const headline = doc.headlineAt(0)!;
    expect(() => headline.properties.set('bad:key', 'x')).toThrow(/invalid property key/);
    expect(() => headline.properties.set('good', 'line\nbreak')).toThrow(/single-line/);
  });
});

test('properties_preservesLinkAndUrlValuesAcrossReads', () => {
  const content =
    '* H\n:PROPERTIES:\n:source: [[id:abc][note]]\n:site: https://example.com/path\n:END:\n';
  const result = editOrgDocument(content, (doc) => {
    const headline = doc.headlineAt(0)!;
    headline.properties.set('source', '[[id:abc][note]]');
    headline.properties.set('site', 'https://example.com/path');
  });
  let readings: Record<string, string> = {};
  editOrgDocument(content, (doc) => {
    readings = doc.headlineAt(0)!.properties.entries;
  });
  expect(readings).toEqual({
    source: '[[id:abc][note]]',
    site: 'https://example.com/path',
  });
  expect(Object.keys(result)).toBeTruthy();
});

test('properties_keepsEmptyValueEntryInsteadOfDroppingIt', () => {
  const content = '* H\n:PROPERTIES:\n:Empty:\n:Title: X\n:END:\n';
  let entries: Record<string, string> = {};
  editOrgDocument(content, (doc) => {
    entries = doc.headlineAt(0)!.properties.entries;
  });
  expect(entries).toEqual({ Empty: '', Title: 'X' });
});

test('properties_neitherTreatsDrawersMarkersAsEntries', () => {
  const content = '* H\n:PROPERTIES:\n:ID: one\n:END:\n';
  let keys: string[] = [];
  editOrgDocument(content, (doc) => {
    keys = (doc.headlineAt(0)!.properties.items ?? []).map((item) => item.key);
  });
  expect(keys).toEqual(['ID']);
});

test('properties_tagListValuePreservedOnRead', () => {
  const content = '* H\n:PROPERTIES:\n:tags: :a:b:\n:END:\n';
  let entries: Record<string, string> = {};
  editOrgDocument(content, (doc) => {
    entries = doc.headlineAt(0)!.properties.entries;
  });
  expect(entries).toEqual({ tags: ':a:b:' });
});
