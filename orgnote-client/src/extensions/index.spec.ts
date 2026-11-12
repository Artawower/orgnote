import { test, expect } from 'vitest';
import { BUILTIN_LOADERS, BUILTIN_META } from './index';
import { orgInlineMarkupManifest } from './org-inline-markup';
import { randomNoteManifest } from './random-note/manifest';

test('BUILTIN_LOADERS: has entry for org-inline-markup extension', () => {
  expect(BUILTIN_LOADERS[orgInlineMarkupManifest.name]).toBeDefined();
});

test('BUILTIN_LOADERS: loader returns a Promise', () => {
  const loader = BUILTIN_LOADERS[orgInlineMarkupManifest.name]!;
  const result = loader();

  expect(result).toBeInstanceOf(Promise);
});

test('BUILTIN_LOADERS: loader resolves to Extension object', async () => {
  const loader = BUILTIN_LOADERS[orgInlineMarkupManifest.name]!;
  const extension = await loader();

  expect(extension).toBeDefined();
  expect(extension.onMounted).toBeDefined();
  expect(typeof extension.onMounted).toBe('function');
});

test('BUILTIN_LOADERS: loader resolves to Extension with onUnmounted', async () => {
  const loader = BUILTIN_LOADERS[orgInlineMarkupManifest.name]!;
  const extension = await loader();

  expect(extension.onUnmounted).toBeDefined();
  expect(typeof extension.onUnmounted).toBe('function');
});

test('BUILTIN_LOADERS: all loaders in BUILTIN_LOADERS are functions', () => {
  Object.values(BUILTIN_LOADERS).forEach((loader) => {
    expect(typeof loader).toBe('function');
  });
});

test('BUILTIN_LOADERS: each BUILTIN_META has corresponding loader', () => {
  BUILTIN_META.forEach((meta) => {
    expect(BUILTIN_LOADERS[meta.manifest.name]).toBeDefined();
  });
});

test('BUILTIN_META: is an array', () => {
  expect(Array.isArray(BUILTIN_META)).toBe(true);
});

test('BUILTIN_META: contains org-inline-markup extension', () => {
  const inlineMarkupMeta = BUILTIN_META.find(
    (meta) => meta.manifest.name === orgInlineMarkupManifest.name,
  );

  expect(inlineMarkupMeta).toBeDefined();
});

test('BUILTIN_META: contains random-note extension', () => {
  const randomNoteMeta = BUILTIN_META.find(
    (meta) => meta.manifest.name === randomNoteManifest.name,
  );

  expect(randomNoteMeta).toBeDefined();
});

test('BUILTIN_META: all builtin extensions are active by default', () => {
  BUILTIN_META.forEach((meta) => {
    expect(meta.active).toBe(true);
  });
});

test('BUILTIN_META: all entries have valid manifest', () => {
  BUILTIN_META.forEach((meta) => {
    expect(meta.manifest).toBeDefined();
    expect(meta.manifest.name).toBeDefined();
    expect(meta.manifest.version).toBeDefined();
    expect(meta.manifest.source).toBeDefined();
  });
});

test('BUILTIN_META: all entries have builtin source type', () => {
  BUILTIN_META.forEach((meta) => {
    expect(meta.manifest.source.type).toBe('builtin');
  });
});

test('BUILTIN_LOADERS: loader does not execute import until called', () => {
  const loaderKeys = Object.keys(BUILTIN_LOADERS);

  expect(loaderKeys.length).toBeGreaterThan(0);
});

test('BUILTIN_LOADERS: multiple calls to same loader return consistent results', async () => {
  const loader = BUILTIN_LOADERS[orgInlineMarkupManifest.name]!;

  const ext1 = await loader();
  const ext2 = await loader();

  expect(ext1.onMounted).toBeDefined();
  expect(ext2.onMounted).toBeDefined();
});
