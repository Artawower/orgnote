import { expect, test, vi } from 'vitest';
import { uint8ArrayToBase64 } from 'orgnote-api';
import type {
  ExtensionAssetDescriptor,
  ExtensionManifest,
  GitRepoHandle,
} from 'orgnote-api';
import { fetchExtensionRuntimeAssets } from './runtime-assets';

const content = new Uint8Array([1, 2, 3]);
const descriptor: ExtensionAssetDescriptor = {
  path: 'fonts/Excalifont.woff2',
  mediaType: 'font/woff2',
  size: content.byteLength,
  integrity: `sha256-${uint8ArrayToBase64(
    new Uint8Array(await crypto.subtle.digest('SHA-256', content)),
  )}`,
};

const manifest: ExtensionManifest = {
  name: 'drawing-viewer',
  version: '1.0.0',
  category: 'extension',
  source: { type: 'git', repo: 'https://example.com/drawing-viewer' },
  assets: [descriptor],
};

const createRepo = (assetContent = content): GitRepoHandle =>
  ({
    readFile: vi.fn(async () => assetContent),
  }) as unknown as GitRepoHandle;

test('fetchExtensionRuntimeAssets downloads declared binary files', async () => {
  const repo = createRepo();

  const assets = await fetchExtensionRuntimeAssets(repo, manifest, 'dist/');

  expect(repo.readFile).toHaveBeenCalledWith('dist/assets/fonts/Excalifont.woff2', 'binary');
  expect(assets).toEqual([{ descriptor, content }]);
});

test('fetchExtensionRuntimeAssets bounds concurrent asset downloads', async () => {
  let activeDownloads = 0;
  let peakDownloads = 0;
  const descriptors = Array.from({ length: 20 }, (_, index) => ({
    ...descriptor,
    path: `fonts/font-${index}.woff2`,
  }));
  const repo = {
    readFile: vi.fn(async () => {
      activeDownloads += 1;
      peakDownloads = Math.max(peakDownloads, activeDownloads);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeDownloads -= 1;
      return content;
    }),
  } as unknown as GitRepoHandle;

  await fetchExtensionRuntimeAssets(repo, { ...manifest, assets: descriptors }, 'dist/');

  expect(peakDownloads).toBeLessThanOrEqual(8);
});

test('fetchExtensionRuntimeAssets rejects size mismatches', async () => {
  await expect(
    fetchExtensionRuntimeAssets(createRepo(new Uint8Array([1])), manifest, 'dist/'),
  ).rejects.toThrow('size');
});

test('fetchExtensionRuntimeAssets rejects integrity mismatches', async () => {
  await expect(
    fetchExtensionRuntimeAssets(createRepo(new Uint8Array([3, 2, 1])), manifest, 'dist/'),
  ).rejects.toThrow('integrity');
});
