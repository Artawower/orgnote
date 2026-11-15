export interface KeyedLock {
  runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T>;
  runExclusiveTree<T>(roots: readonly string[], operation: () => Promise<T>): Promise<T>;
  isLocked(key: string): boolean;
}

type Tails = Map<string, Promise<unknown>>;

const isInsideTree = (key: string, root: string): boolean =>
  key === root || key.startsWith(root.endsWith('/') ? root : `${root}/`);

const areTreesOverlapping = (left: string, right: string): boolean =>
  isInsideTree(left, right) || isInsideTree(right, left);

const collectTails = (tails: Tails, isDependency: (key: string) => boolean): Promise<unknown>[] =>
  [...tails].filter(([key]) => isDependency(key)).map(([, tail]) => tail);

const trackTail = (tails: Tails, key: string, tail: Promise<unknown>): void => {
  const release = (): void => {
    if (tails.get(key) === tail) tails.delete(key);
  };
  tails.set(key, tail);
  tail.then(release, release);
};

export const createKeyedLock = (): KeyedLock => {
  const fileTails: Tails = new Map();
  const treeTails: Tails = new Map();

  const runAfter = <T>(dependencies: Promise<unknown>[], operation: () => Promise<T>): Promise<T> =>
    Promise.allSettled(dependencies).then(operation);

  const runExclusive = <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    const dependencies = [
      ...collectTails(fileTails, (fileKey) => fileKey === key),
      ...collectTails(treeTails, (root) => isInsideTree(key, root)),
    ];
    const current = runAfter(dependencies, operation);
    trackTail(fileTails, key, current);
    return current;
  };

  const runExclusiveTree = <T>(
    roots: readonly string[],
    operation: () => Promise<T>
  ): Promise<T> => {
    const isInsideAnyRoot = (key: string): boolean => roots.some((root) => isInsideTree(key, root));
    const overlapsAnyRoot = (key: string): boolean =>
      roots.some((root) => areTreesOverlapping(key, root));
    const dependencies = [
      ...collectTails(fileTails, isInsideAnyRoot),
      ...collectTails(treeTails, overlapsAnyRoot),
    ];
    const current = runAfter(dependencies, operation);
    roots.forEach((root) => trackTail(treeTails, root, current));
    return current;
  };

  const isLocked = (key: string): boolean =>
    fileTails.has(key) || [...treeTails.keys()].some((root) => isInsideTree(key, root));

  return { runExclusive, runExclusiveTree, isLocked };
};
