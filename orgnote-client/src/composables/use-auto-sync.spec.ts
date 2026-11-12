import { expect, test, vi, beforeEach } from 'vitest';
import { ref, nextTick, type Ref } from 'vue';
import { useAutoSync, type UseAutoSyncDeps } from './use-auto-sync';

type User = { active?: string; isAnonymous?: boolean } | null | undefined;

const createUser = (active?: string): User => ({ active });

const flushWatchers = async () => {
  await nextTick();
  await nextTick();
  await new Promise((r) => setTimeout(r, 0));
};

let userRef: Ref<User>;
let isSelfHostedRef: Ref<boolean>;
let runPostActivationSyncMock: ReturnType<typeof vi.fn>;
let onErrorMock: ReturnType<typeof vi.fn>;
let deps: UseAutoSyncDeps;

beforeEach(() => {
  userRef = ref<User>(null);
  isSelfHostedRef = ref(false);
  runPostActivationSyncMock = vi.fn().mockResolvedValue(undefined);
  onErrorMock = vi.fn();
  deps = {
    userRef,
    isSelfHostedRef,
    sync: runPostActivationSyncMock as UseAutoSyncDeps['sync'],
    onError: onErrorMock as UseAutoSyncDeps['onError'],
  };
});

test('useAutoSync: triggers sync when user becomes active', async () => {
  useAutoSync(deps);

  userRef.value = createUser('true');
  await flushWatchers();

  expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1);
});

test('useAutoSync: triggers sync on transition from inactive to active', async () => {
  userRef.value = createUser(undefined);
  useAutoSync(deps);

  userRef.value = createUser('true');
  await flushWatchers();

  expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1);
});

test('useAutoSync: does not trigger sync when user was already active', async () => {
  userRef.value = createUser('true');
  useAutoSync(deps);

  userRef.value = createUser('yes');
  await flushWatchers();

  expect(runPostActivationSyncMock).not.toHaveBeenCalled();
});

test('useAutoSync: triggers sync when an inactive user signs in to a self-hosted server', async () => {
  isSelfHostedRef.value = true;
  useAutoSync(deps);

  userRef.value = createUser(undefined);
  await flushWatchers();

  expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1);
});

test('useAutoSync: triggers sync when self-hosted detection completes', async () => {
  userRef.value = createUser(undefined);
  useAutoSync(deps);

  isSelfHostedRef.value = true;
  await flushWatchers();

  expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1);
});

test('useAutoSync: does not trigger sync for anonymous self-hosted users', async () => {
  userRef.value = { isAnonymous: true };
  useAutoSync(deps);

  isSelfHostedRef.value = true;
  await flushWatchers();

  expect(runPostActivationSyncMock).not.toHaveBeenCalled();
});

test('useAutoSync: does not trigger sync when user becomes inactive', async () => {
  useAutoSync(deps);

  userRef.value = createUser(undefined);
  await flushWatchers();

  expect(runPostActivationSyncMock).not.toHaveBeenCalled();
});

test('useAutoSync: does not trigger sync on logout', async () => {
  userRef.value = createUser('true');
  useAutoSync(deps);

  userRef.value = null;
  await flushWatchers();

  expect(runPostActivationSyncMock).not.toHaveBeenCalled();
});

test('useAutoSync: calls onError when sync fails', async () => {
  const error = new Error('Sync failed');
  runPostActivationSyncMock.mockRejectedValueOnce(error);
  useAutoSync(deps);

  userRef.value = createUser('true');
  await flushWatchers();

  expect(onErrorMock).toHaveBeenCalledWith(error);
});

test('useAutoSync: triggers sync on each transition to active state', async () => {
  useAutoSync(deps);

  userRef.value = createUser('true');
  await flushWatchers();
  expect(runPostActivationSyncMock).toHaveBeenCalledTimes(1);

  userRef.value = createUser(undefined);
  await flushWatchers();

  userRef.value = createUser('true');
  await flushWatchers();
  expect(runPostActivationSyncMock).toHaveBeenCalledTimes(2);
});

test('useAutoSync: returns stop handle that stops watching', async () => {
  const stop = useAutoSync(deps);
  stop();

  userRef.value = createUser('true');
  await flushWatchers();

  expect(runPostActivationSyncMock).not.toHaveBeenCalled();
});
