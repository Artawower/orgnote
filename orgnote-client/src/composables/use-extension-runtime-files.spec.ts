import { expect, test, vi } from 'vitest';
import type { ExtensionManifest, FileSystemStore } from 'orgnote-api';
import { useExtensionRuntimeFiles } from './use-extension-runtime-files';

const manifest: ExtensionManifest = {
  name: 'drawing-viewer',
  version: '1.0.0',
  category: 'extension',
  source: { type: 'git', repo: 'https://example.com/drawing-viewer' },
  assets: [
    {
      path: 'fonts/Excalifont.woff2',
      mediaType: 'font/woff2',
      size: 3,
      integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    },
  ],
};

const createFileSystem = (): FileSystemStore =>
  ({
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rmdir: vi.fn().mockResolvedValue(undefined),
  }) as unknown as FileSystemStore;

test('write stores the entry and assets together', async () => {
  const fileSystem = createFileSystem();
  const runtimeFiles = useExtensionRuntimeFiles(fileSystem);
  const content = new Uint8Array([1, 2, 3]);

  await runtimeFiles.write(manifest, 'export default {};', [
    { descriptor: manifest.assets![0]!, content },
  ]);

  expect(fileSystem.writeFile).toHaveBeenNthCalledWith(
    1,
    '.orgnote/extensions/drawing-viewer/1.0.0/index.js',
    'export default {};',
  );
  expect(fileSystem.writeFile).toHaveBeenNthCalledWith(
    2,
    '.orgnote/extensions/drawing-viewer/1.0.0/assets/fonts/Excalifont.woff2',
    content,
  );
});

test('write bounds concurrent asset operations', async () => {
  let activeWrites = 0;
  let peakWrites = 0;
  const fileSystem = createFileSystem();
  vi.mocked(fileSystem.writeFile).mockImplementation(async () => {
    activeWrites += 1;
    peakWrites = Math.max(peakWrites, activeWrites);
    await new Promise((resolve) => setTimeout(resolve, 1));
    activeWrites -= 1;
  });
  const runtimeFiles = useExtensionRuntimeFiles(fileSystem);
  const descriptors = Array.from({ length: 20 }, (_, index) => ({
    ...manifest.assets![0]!,
    path: `asset-${index}.bin`,
  }));
  const assets = descriptors.map((descriptor, index) => ({
    descriptor,
    content: new Uint8Array([index]),
  }));

  await runtimeFiles.write({ ...manifest, assets: descriptors }, 'export default {};', assets);

  expect(peakWrites).toBeLessThanOrEqual(8);
});

test('readEntry reads the versioned entry file', async () => {
  const fileSystem = createFileSystem();
  const runtimeFiles = useExtensionRuntimeFiles(fileSystem);
  vi.mocked(fileSystem.readFile).mockResolvedValue('export default {};');

  const content = await runtimeFiles.readEntry(manifest);

  expect(content).toBe('export default {};');
  expect(fileSystem.readFile).toHaveBeenCalledWith(
    '.orgnote/extensions/drawing-viewer/1.0.0/index.js',
    'utf8',
  );
});

test('readAsset reads a declared binary runtime asset', async () => {
  const fileSystem = createFileSystem();
  const runtimeFiles = useExtensionRuntimeFiles(fileSystem);
  const content = new Uint8Array([1, 2, 3]);
  vi.mocked(fileSystem.readFile).mockResolvedValue(content);

  const result = await runtimeFiles.readAsset(manifest, manifest.assets![0]!.path);

  expect(result).toEqual(content);
  expect(fileSystem.readFile).toHaveBeenCalledWith(
    '.orgnote/extensions/drawing-viewer/1.0.0/assets/fonts/Excalifont.woff2',
    'binary',
  );
});

test('removeAll removes every installed version', async () => {
  const fileSystem = createFileSystem();
  const runtimeFiles = useExtensionRuntimeFiles(fileSystem);

  await runtimeFiles.removeAll(manifest.name);

  expect(fileSystem.rmdir).toHaveBeenCalledWith('.orgnote/extensions/drawing-viewer');
});

test('remove removes the versioned runtime directory', async () => {
  const fileSystem = createFileSystem();
  const runtimeFiles = useExtensionRuntimeFiles(fileSystem);

  await runtimeFiles.remove(manifest);

  expect(fileSystem.rmdir).toHaveBeenCalledWith(
    '.orgnote/extensions/drawing-viewer/1.0.0',
  );
});
