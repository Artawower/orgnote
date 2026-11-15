import type { FileSystem } from 'orgnote-api';
import { to } from 'orgnote-api/utils';

const gateQueues = new WeakMap<FileSystem, Promise<unknown>>();

const chainGate = async (
  previousTail: Promise<unknown>,
  gatePromise: Promise<void>,
): Promise<void> => {
  await to(() => previousTail)();
  await gatePromise;
};

const enqueueGate = (fs: FileSystem): { wait: Promise<unknown>; release: () => void } => {
  const currentTail = gateQueues.get(fs) ?? Promise.resolve();
  let release = (): void => {};
  const gatePromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  gateQueues.set(fs, chainGate(currentTail, gatePromise));
  return { wait: currentTail, release };
};

export const withFsRootGate = async <T>(
  fs: FileSystem,
  operation: () => Promise<T>,
): Promise<T> => {
  const { wait, release } = enqueueGate(fs);
  await wait;
  const result = await to(operation)();
  release();
  if (result.isErr()) throw result.error;
  return result.value;
};
