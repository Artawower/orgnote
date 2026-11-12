import { expect, test, vi } from 'vitest';
import type { ExtensionManifest, GitRepoHandle } from 'orgnote-api';
import { uint8ArrayToBase64 } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import type { ExtensionInstallerRequest } from './extension-installer-contract';
import {
  ExtensionManifestJsonError,
  fetchExtensionPackageFromGit,
  fetchExtensionPackageFromRepo,
} from './fetch-extension-package';

const source = {
  type: 'git' as const,
  repo: 'https://example.com/extension',
};

const request: ExtensionInstallerRequest = { source };
const rawContent = 'export default {};';
const assetContent = new Uint8Array([1, 2, 3]);
const integrity = async (): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', assetContent);
  return `sha256-${uint8ArrayToBase64(new Uint8Array(digest))}`;
};

const createRepo = (
  files: Readonly<Record<string, string | Uint8Array>>,
): GitRepoHandle => {
  const readFile = vi.fn(async (path: string) => {
    const content = files[path];
    if (content === undefined) throw new TypeError(`Missing fixture: ${path}`);
    return content;
  });
  return {
    fileExists: vi.fn(async (path: string) =>
      path === 'dist' || Object.hasOwn(files, path),
    ),
    readFile,
    close: vi.fn(),
  } as unknown as GitRepoHandle;
};

const createManifest = async (): Promise<ExtensionManifest> => ({
  name: 'worker-installed-extension',
  version: '1.0.0',
  category: 'extension',
  source,
  assets: [
    {
      path: 'data.bin',
      mediaType: 'application/octet-stream',
      size: assetContent.byteLength,
      integrity: await integrity(),
    },
  ],
});

test('package fetch reads and verifies a dist package', async () => {
  const manifest = await createManifest();
  const repo = createRepo({
    'dist/index.js': rawContent,
    'dist/manifest.json': JSON.stringify(manifest),
    'dist/assets/data.bin': assetContent,
  });

  const result = await fetchExtensionPackageFromRepo(repo, request);

  expect(result).toEqual({
    manifest,
    rawContent,
    assets: [{ descriptor: manifest.assets![0]!, content: assetContent }],
  });
  expect(repo.readFile).toHaveBeenCalledWith('dist/index.js', 'utf8');
  expect(repo.readFile).toHaveBeenCalledWith('dist/assets/data.bin', 'binary');
});

test('package fetch leaves legacy manifest extraction to the host', async () => {
  const repo = createRepo({ 'index.js': rawContent });
  vi.mocked(repo.fileExists).mockResolvedValue(false);

  const result = await fetchExtensionPackageFromRepo(repo, request);

  expect(result).toEqual({ rawContent, assets: [] });
});

test('Git package fetch passes network options and closes its repository', async () => {
  const repo = createRepo({ 'index.js': rawContent });
  vi.mocked(repo.fileExists).mockResolvedValue(false);
  const openRepo = vi.fn(async () => repo);

  await fetchExtensionPackageFromGit({
    source: { ...source, branch: 'next' },
    corsProxy: 'https://proxy.example/',
  }, openRepo);

  expect(openRepo).toHaveBeenCalledWith(
    { url: source.repo, branch: 'next' },
    { corsProxy: 'https://proxy.example/' },
  );
  expect(repo.close).toHaveBeenCalledOnce();
});

test('Git package fetch closes its repository after failure', async () => {
  const repo = createRepo({});
  vi.mocked(repo.fileExists).mockResolvedValue(false);
  const openRepo = vi.fn(async () => repo);

  await expect(fetchExtensionPackageFromGit(request, openRepo)).rejects.toThrow(
    'Missing fixture: index.js',
  );
  expect(repo.close).toHaveBeenCalledOnce();
});

test('Git package fetch reports repository cleanup failure after successful fetch', async () => {
  const repo = createRepo({ 'index.js': rawContent });
  vi.mocked(repo.fileExists).mockResolvedValue(false);
  vi.mocked(repo.close).mockImplementation(() => {
    throw new Error('close failed');
  });

  await expect(fetchExtensionPackageFromGit(request, async () => repo)).rejects.toThrow(
    'close failed',
  );
});

test('Git package fetch preserves its failure when repository cleanup fails', async () => {
  const repo = createRepo({});
  vi.mocked(repo.fileExists).mockResolvedValue(false);
  vi.mocked(repo.close).mockImplementation(() => {
    throw new Error('close failed');
  });

  await expect(fetchExtensionPackageFromGit(request, async () => repo)).rejects.toThrow(
    'Missing fixture: index.js',
  );
  expect(repo.close).toHaveBeenCalledOnce();
});

test('package fetch rejects invalid manifest JSON', async () => {
  const repo = createRepo({
    'dist/index.js': rawContent,
    'dist/manifest.json': '{invalid',
  });

  const fetchResult = await to(fetchExtensionPackageFromRepo)(repo, request);
  if (fetchResult.isOk()) throw new TypeError('Expected package fetch to fail');
  expect(fetchResult.error).toBeInstanceOf(ExtensionManifestJsonError);
  expect(fetchResult.error).toMatchObject({
    name: 'ExtensionManifestJsonError',
    message: 'Invalid extension manifest JSON: dist/manifest.json',
  });
});
