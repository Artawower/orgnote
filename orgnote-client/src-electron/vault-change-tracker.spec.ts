import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createVaultChangeTracker, type VaultChange } from './vault-change-tracker';

type StatFunction = (target: string) => Promise<unknown>;

let vaultPath: string;
let outsidePath: string;

const toChangeSummary = ({ absolutePath, type }: VaultChange) => ({
  path: path.relative(vaultPath, absolutePath),
  type,
});

const createTracker = async () => {
  const tracker = createVaultChangeTracker(vaultPath);
  await tracker.ready;
  return tracker;
};

const resolveSummaries = async (
  tracker: ReturnType<typeof createVaultChangeTracker>,
  relativePath: string,
) => (await tracker.resolveChanges(path.join(vaultPath, relativePath))).map(toChangeSummary);

const accessDenied = () => Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });

const interceptStatCalls = (intercept: (target: string, original: StatFunction) => Promise<unknown>) => {
  const originalStat: StatFunction = fs.stat.bind(fs);
  const originalLstat: StatFunction = fs.lstat.bind(fs);
  const wrap = (original: StatFunction) => ((target: string) => intercept(target, original)) as never;
  vi.spyOn(fs, 'stat').mockImplementation(wrap(originalStat));
  vi.spyOn(fs, 'lstat').mockImplementation(wrap(originalLstat));
};

beforeEach(async () => {
  vaultPath = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'orgnote-tracker-')));
  outsidePath = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'orgnote-outside-')));
  await fs.mkdir(path.join(vaultPath, 'notes'));
  await fs.writeFile(path.join(vaultPath, 'notes', 'known.org'), '* known');
  await fs.mkdir(path.join(outsidePath, 'external'));
  await fs.writeFile(path.join(outsidePath, 'external', 'secret.org'), '* secret');
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(vaultPath, { recursive: true, force: true });
  await fs.rm(outsidePath, { recursive: true, force: true });
});

test('createVaultChangeTracker does not follow a symlink that points outside the vault', async () => {
  await fs.symlink(path.join(outsidePath, 'external'), path.join(vaultPath, 'escape'));
  const tracker = await createTracker();

  expect(await resolveSummaries(tracker, 'escape')).toEqual([]);
  expect(await resolveSummaries(tracker, 'escape/secret.org')).toEqual([]);
});

test('createVaultChangeTracker ignores a symlink to an outside directory created after start', async () => {
  const tracker = await createTracker();
  await fs.symlink(path.join(outsidePath, 'external'), path.join(vaultPath, 'escape'));

  expect(await resolveSummaries(tracker, 'escape')).toEqual([]);
});

test('createVaultChangeTracker reports the latest state when settles for one path overlap', async () => {
  const notePath = path.join(vaultPath, 'notes', 'known.org');
  const { promise: firstStatGate, resolve: releaseFirstStat } = Promise.withResolvers<void>();
  const { promise: firstStatStarted, resolve: markFirstStatStarted } = Promise.withResolvers<void>();
  let noteStatCalls = 0;
  const tracker = await createTracker();
  interceptStatCalls(async (target, original) => {
    if (target !== notePath) return original(target);
    noteStatCalls += 1;
    if (noteStatCalls > 1) return original(target);
    const stat = await original(target);
    markFirstStatStarted();
    await firstStatGate;
    return stat;
  });

  const publishedChanges: VaultChange[] = [];
  const publish = (changes: VaultChange[]) => publishedChanges.push(...changes);

  const staleResolution = tracker.resolveChanges(notePath).then(publish);
  await firstStatStarted;
  await fs.rm(notePath);
  const freshResolution = tracker.resolveChanges(notePath).then(publish);
  await new Promise((resolve) => setTimeout(resolve, 50));
  releaseFirstStat();
  await Promise.all([staleResolution, freshResolution]);

  expect(publishedChanges.map(toChangeSummary).at(-1)).toEqual({ path: 'notes/known.org', type: 'delete' });
  expect(await resolveSummaries(tracker, 'notes/known.org')).toEqual([]);
});

test('createVaultChangeTracker retries a directory whose expansion failed', async () => {
  const tracker = await createTracker();
  await fs.mkdir(path.join(vaultPath, 'incoming', 'nested'), { recursive: true });
  const nestedNote = path.join(vaultPath, 'incoming', 'nested', 'a.org');
  await fs.writeFile(nestedNote, '* a');
  let isNestedNoteDenied = true;
  interceptStatCalls(async (target, original) => {
    if (target !== nestedNote || !isNestedNoteDenied) return original(target);
    isNestedNoteDenied = false;
    throw accessDenied();
  });

  await expect(tracker.resolveChanges(path.join(vaultPath, 'incoming'))).rejects.toMatchObject({ code: 'EACCES' });

  expect(await resolveSummaries(tracker, 'incoming')).toContainEqual({
    path: 'incoming/nested/a.org',
    type: 'create',
  });
});

test('createVaultChangeTracker reconciles a known directory replaced by a populated one', async () => {
  await fs.mkdir(path.join(vaultPath, 'slot'));
  const tracker = await createTracker();
  await fs.rm(path.join(vaultPath, 'slot'), { recursive: true });
  await fs.mkdir(path.join(vaultPath, 'slot'));
  await fs.writeFile(path.join(vaultPath, 'slot', 'arrived.org'), '* arrived');

  expect(await resolveSummaries(tracker, 'slot')).toEqual([{ path: 'slot/arrived.org', type: 'create' }]);
});

test('createVaultChangeTracker reports removed entries of a known directory', async () => {
  const tracker = await createTracker();
  await fs.rm(path.join(vaultPath, 'notes', 'known.org'));

  expect(await resolveSummaries(tracker, 'notes')).toEqual([{ path: 'notes/known.org', type: 'delete' }]);
});

test('createVaultChangeTracker deletes a known directory together with its descendants', async () => {
  const tracker = await createTracker();
  await fs.rm(path.join(vaultPath, 'notes'), { recursive: true });

  expect(await resolveSummaries(tracker, 'notes')).toEqual([
    { path: 'notes/known.org', type: 'delete' },
    { path: 'notes', type: 'delete' },
  ]);
});

test('createVaultChangeTracker reports nothing for an unknown missing path', async () => {
  const tracker = await createTracker();

  expect(await resolveSummaries(tracker, 'never-existed.org')).toEqual([]);
});

test('createVaultChangeTracker does not walk into a directory replaced by an outside symlink mid-scan', async () => {
  await fs.mkdir(path.join(vaultPath, 'branch'));
  const originalReaddir = fs.readdir.bind(fs) as (target: string, options: unknown) => Promise<unknown>;
  vi.spyOn(fs, 'readdir').mockImplementation((async (target: string, options: unknown) => {
    const entries = await originalReaddir(target, options);
    if (target !== vaultPath) return entries;
    await fs.rm(path.join(vaultPath, 'branch'), { recursive: true });
    await fs.symlink(path.join(outsidePath, 'external'), path.join(vaultPath, 'branch'));
    return entries;
  }) as never);

  const tracker = await createTracker();
  vi.restoreAllMocks();

  expect(await resolveSummaries(tracker, 'branch')).toEqual([]);
});

test('createVaultChangeTracker reports a file replaced by a directory as delete then create', async () => {
  const tracker = await createTracker();
  await fs.rm(path.join(vaultPath, 'notes', 'known.org'));
  await fs.mkdir(path.join(vaultPath, 'notes', 'known.org'));
  await fs.writeFile(path.join(vaultPath, 'notes', 'known.org', 'child.org'), '* child');

  expect(await resolveSummaries(tracker, 'notes/known.org')).toEqual([
    { path: 'notes/known.org', type: 'delete' },
    { path: 'notes/known.org', type: 'create' },
    { path: 'notes/known.org/child.org', type: 'create' },
  ]);
});

test('createVaultChangeTracker reports a directory replaced by a file as delete then create', async () => {
  const tracker = await createTracker();
  await fs.rm(path.join(vaultPath, 'notes'), { recursive: true });
  await fs.writeFile(path.join(vaultPath, 'notes'), '* now a file');

  expect(await resolveSummaries(tracker, 'notes')).toEqual([
    { path: 'notes/known.org', type: 'delete' },
    { path: 'notes', type: 'delete' },
    { path: 'notes', type: 'create' },
  ]);
});

test('createVaultChangeTracker reports files of a directory replaced under the same names as modified', async () => {
  const tracker = await createTracker();
  await fs.rename(path.join(vaultPath, 'notes'), path.join(outsidePath, 'old-notes'));
  await fs.mkdir(path.join(outsidePath, 'new-notes'));
  await fs.writeFile(path.join(outsidePath, 'new-notes', 'known.org'), '* replaced content');
  await fs.rename(path.join(outsidePath, 'new-notes'), path.join(vaultPath, 'notes'));

  expect(await resolveSummaries(tracker, 'notes')).toEqual([{ path: 'notes/known.org', type: 'modify' }]);
});
