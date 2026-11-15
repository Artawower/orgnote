import { test, expect } from 'vitest';
import { parse, withMetaInfo } from 'org-mode-ast';
import {
  parseStartupOption,
  getMaxVisibleLevel,
  collectHeadlines,
} from './startup-options';

const createOrgTree = (doc: string) => withMetaInfo(parse(doc));

test('parseStartupOption returns null for document without STARTUP', () => {
  const root = createOrgTree('* Headline\nSome content');
  expect(parseStartupOption(root)).toBeNull();
});

test('parseStartupOption parses overview option', () => {
  const root = createOrgTree('#+STARTUP: overview\n* Headline');
  expect(parseStartupOption(root)).toBe('overview');
});

test('parseStartupOption parses showeverything option', () => {
  const root = createOrgTree('#+STARTUP: showeverything\n* Headline');
  expect(parseStartupOption(root)).toBe('showeverything');
});

test('parseStartupOption parses content option', () => {
  const root = createOrgTree('#+STARTUP: content\n* Headline');
  expect(parseStartupOption(root)).toBe('content');
});

test('parseStartupOption parses show2levels option', () => {
  const root = createOrgTree('#+STARTUP: show2levels\n* Headline');
  expect(parseStartupOption(root)).toBe('show2levels');
});

test('parseStartupOption handles multiple options and picks first valid', () => {
  const root = createOrgTree('#+STARTUP: indent overview\n* Headline');
  expect(parseStartupOption(root)).toBe('overview');
});

test('parseStartupOption is case insensitive', () => {
  const root = createOrgTree('#+STARTUP: OVERVIEW\n* Headline');
  expect(parseStartupOption(root)).toBe('overview');
});

test('getMaxVisibleLevel returns null for showeverything', () => {
  expect(getMaxVisibleLevel('showeverything')).toBeNull();
});

test('getMaxVisibleLevel returns null for showall', () => {
  expect(getMaxVisibleLevel('showall')).toBeNull();
});

test('getMaxVisibleLevel returns 1 for overview', () => {
  expect(getMaxVisibleLevel('overview')).toBe(1);
});

test('getMaxVisibleLevel returns Infinity for content', () => {
  expect(getMaxVisibleLevel('content')).toBe(Infinity);
});

test('getMaxVisibleLevel returns correct level for show2levels', () => {
  expect(getMaxVisibleLevel('show2levels')).toBe(2);
});

test('getMaxVisibleLevel returns correct level for show3levels', () => {
  expect(getMaxVisibleLevel('show3levels')).toBe(3);
});

test('collectHeadlines returns empty array for document without headlines', () => {
  const doc = 'Just some text';
  const root = createOrgTree(doc);
  expect(collectHeadlines(root)).toEqual([]);
});

test('collectHeadlines collects single headline', () => {
  const doc = '* Headline\nContent here';
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  expect(headlines).toHaveLength(1);
  expect(headlines[0]?.level).toBe(1);
});

test('collectHeadlines collects nested headlines with sections', () => {
  const doc = '* Level 1\n** Level 2\nContent';
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  expect(headlines).toHaveLength(2);
  expect(headlines[0]?.level).toBe(1);
  expect(headlines[1]?.level).toBe(2);
});

test('collectHeadlines skips headlines without sections', () => {
  const doc = '* Level 1\n** Level 2';
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  expect(headlines).toHaveLength(1);
  expect(headlines[0]?.level).toBe(1);
});

test('collectHeadlines captures section boundaries', () => {
  const doc = '* Headline\nSection content\nMore content';
  const root = createOrgTree(doc);
  const headlines = collectHeadlines(root);

  expect(headlines).toHaveLength(1);
  const headline = headlines[0];
  expect(headline).toBeDefined();
  expect(headline?.sectionStart).toBeGreaterThan(headline?.start ?? 0);
  expect(headline?.sectionEnd).toBe(doc.length);
});
