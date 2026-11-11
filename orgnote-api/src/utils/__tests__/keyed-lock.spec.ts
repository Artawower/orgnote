import { expect, test } from 'vitest';
import { createKeyedLock } from '../keyed-lock';

const createDeferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('createKeyedLock runs operations with the same key one after another', async () => {
  const lock = createKeyedLock();
  const events: string[] = [];
  const firstGate = createDeferred();

  const first = lock.runExclusive('/work.org', async () => {
    events.push('first:start');
    await firstGate.promise;
    events.push('first:end');
  });
  const second = lock.runExclusive('/work.org', async () => {
    events.push('second:start');
  });
  await Promise.resolve();
  firstGate.resolve();
  await Promise.all([first, second]);

  expect(events).toEqual(['first:start', 'first:end', 'second:start']);
});

test('createKeyedLock rejects the failed operation and still runs the next one', async () => {
  const lock = createKeyedLock();
  const failure = new Error('write failed');

  const failed = lock.runExclusive('/work.org', () => Promise.reject(failure));
  const next = lock.runExclusive('/work.org', () => Promise.resolve('written'));

  await expect(failed).rejects.toBe(failure);
  await expect(next).resolves.toBe('written');
});

test('createKeyedLock does not make different keys wait for each other', async () => {
  const lock = createKeyedLock();
  const blockedGate = createDeferred();
  const blocked = lock.runExclusive('/work.org', () => blockedGate.promise);

  const other = await lock.runExclusive('/home.org', () => Promise.resolve('home'));

  expect(other).toBe('home');
  blockedGate.resolve();
  await blocked;
});

test('createKeyedLock releases a key once its last operation settles', async () => {
  const lock = createKeyedLock();
  const gate = createDeferred();

  const running = lock.runExclusive('/work.org', () => gate.promise);
  const isLockedWhileRunning = lock.isLocked('/work.org');
  gate.resolve();
  await running;
  await lock.runExclusive('/work.org', () => Promise.reject(new Error('failed'))).catch(
    (error: unknown) => error,
  );

  expect(isLockedWhileRunning).toBe(true);
  expect(lock.isLocked('/work.org')).toBe(false);
});

test('createKeyedLock tree operations wait for keys inside the tree and block new ones', async () => {
  const lock = createKeyedLock();
  const events: string[] = [];
  const fileGate = createDeferred();

  const fileUpdate = lock.runExclusive('/notes/work.org', async () => {
    events.push('file:start');
    await fileGate.promise;
    events.push('file:end');
  });
  const directoryRename = lock.runExclusiveTree(['/notes'], async () => {
    events.push('tree');
  });
  const laterUpdate = lock.runExclusive('/notes/home.org', async () => {
    events.push('later');
  });
  const siblingUpdate = await lock.runExclusive('/notes-archive.org', async () => {
    events.push('sibling');
    return 'sibling';
  });
  fileGate.resolve();
  await Promise.all([fileUpdate, directoryRename, laterUpdate]);

  expect(siblingUpdate).toBe('sibling');
  expect(events).toEqual(['file:start', 'sibling', 'file:end', 'tree', 'later']);
});

test('createKeyedLock tree operation over nested roots acquires them at once', async () => {
  const lock = createKeyedLock();

  const result = await lock.runExclusiveTree(['/notes', '/notes/archive'], async () => 'moved');

  expect(result).toBe('moved');
  expect(lock.isLocked('/notes/archive/work.org')).toBe(false);
});
