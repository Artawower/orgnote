export const createPromise = <T = unknown>(): [Promise<T>, (value: T) => void] => {
  let resolver!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolver = resolve;
  });
  return [promise, resolver];
};
