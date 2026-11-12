import { safeParse } from 'valibot';
import { expect, expectTypeOf, test } from 'vitest';
import {
  EXTENSION_MANIFEST_SCHEMA,
  type Extension,
  type ExtensionAssetDescriptor,
  ExtensionAssetNotDeclaredError,
  getExtensionAssetPath,
  getExtensionEntryPath,
  getExtensionRootPath,
  getExtensionRuntimePath,
} from '../index';

const ASSET = {
  path: 'fonts/Excalifont.woff2',
  mediaType: 'font/woff2',
  size: 1024,
  integrity: `sha256-${'a'.repeat(43)}=`,
};

const WORKER_ASSET = {
  path: 'workers/indexer.js',
  mediaType: 'text/javascript',
  size: 2048,
  integrity: `sha256-${'b'.repeat(43)}=`,
};

const WORKER = {
  id: 'drawing-viewer.indexer',
  path: WORKER_ASSET.path,
  capabilities: ['files:read'] as const,
};

const createManifest = () => ({
  name: 'drawing-viewer',
  version: '1.0.0',
  category: 'extension' as const,
  source: { type: 'local' as const },
  assets: [ASSET],
});

test('extension manifest preserves declared assets', () => {
  const result = safeParse(EXTENSION_MANIFEST_SCHEMA, createManifest());

  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.output.assets).toEqual([ASSET]);
});

test('extension manifest preserves declared workers', () => {
  const result = safeParse(EXTENSION_MANIFEST_SCHEMA, {
    ...createManifest(),
    assets: [ASSET, WORKER_ASSET],
    workers: [WORKER],
  });

  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.output.workers).toEqual([WORKER]);
});

test('extension manifest rejects undeclared worker assets', () => {
  const result = safeParse(EXTENSION_MANIFEST_SCHEMA, {
    ...createManifest(),
    workers: [WORKER],
  });

  expect(result.success).toBe(false);
});

test('extension manifest rejects non-JavaScript worker assets', () => {
  const result = safeParse(EXTENSION_MANIFEST_SCHEMA, {
    ...createManifest(),
    assets: [ASSET, { ...WORKER_ASSET, mediaType: 'application/octet-stream' }],
    workers: [WORKER],
  });

  expect(result.success).toBe(false);
});

test('extension manifest rejects duplicate worker ids', () => {
  const result = safeParse(EXTENSION_MANIFEST_SCHEMA, {
    ...createManifest(),
    assets: [ASSET, WORKER_ASSET],
    workers: [WORKER, { ...WORKER }],
  });

  expect(result.success).toBe(false);
});

test('extension manifest rejects unsafe asset paths', () => {
  const unsafePaths = [
    '/fonts/font.woff2',
    '../fonts/font.woff2',
    'fonts/../font.woff2',
    'fonts\\font.woff2',
    'https://example.com/font.woff2',
  ];

  const results = unsafePaths.map((path) =>
    safeParse(EXTENSION_MANIFEST_SCHEMA, {
      ...createManifest(),
      assets: [{ ...ASSET, path }],
    }),
  );

  expect(results.every((result) => !result.success)).toBe(true);
});

test('extension manifest rejects duplicate asset paths', () => {
  const result = safeParse(EXTENSION_MANIFEST_SCHEMA, {
    ...createManifest(),
    assets: [ASSET, { ...ASSET }],
  });

  expect(result.success).toBe(false);
});

test('extension manifest rejects invalid asset metadata', () => {
  const invalidAssets = [
    { ...ASSET, mediaType: 'woff2' },
    { ...ASSET, size: -1 },
    { ...ASSET, size: 1.5 },
    { ...ASSET, integrity: 'sha256-invalid' },
  ];

  const results = invalidAssets.map((asset) =>
    safeParse(EXTENSION_MANIFEST_SCHEMA, {
      ...createManifest(),
      assets: [asset],
    }),
  );

  expect(results.every((result) => !result.success)).toBe(true);
});

test('public API builds extension runtime file paths', () => {
  const manifest = createManifest();

  expectTypeOf<ExtensionAssetDescriptor>().toMatchTypeOf<typeof ASSET>();
  expect(getExtensionRootPath(manifest.name)).toBe(
    '.orgnote/extensions/drawing-viewer',
  );
  expect(getExtensionRuntimePath(manifest)).toBe(
    '.orgnote/extensions/drawing-viewer/1.0.0',
  );
  expect(getExtensionEntryPath(manifest)).toBe(
    '.orgnote/extensions/drawing-viewer/1.0.0/index.js',
  );
  expect(getExtensionAssetPath(manifest, ASSET.path)).toBe(
    '.orgnote/extensions/drawing-viewer/1.0.0/assets/fonts/Excalifont.woff2',
  );
});

test('extension runtime paths encode identity segments', () => {
  const manifest = {
    ...createManifest(),
    name: '@example/drawing viewer',
    version: '../next',
  };

  expect(getExtensionRuntimePath(manifest)).toBe(
    '.orgnote/extensions/%40example%2Fdrawing%20viewer/..%2Fnext',
  );
});

test('extension asset path rejects undeclared files', () => {
  expect(() => getExtensionAssetPath(createManifest(), 'fonts/Unknown.woff2')).toThrow(
    ExtensionAssetNotDeclaredError,
  );
});

test('extension lifecycle remains unchanged', () => {
  const extension: Extension = {
    onMounted: () => undefined,
    onUnmounted: () => undefined,
  };

  expect(extension.onMounted).toBeTypeOf('function');
  expect(extension.onUnmounted).toBeTypeOf('function');
});

