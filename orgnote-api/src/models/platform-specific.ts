// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlatformSpecificFn = <T extends (...params: any[]) => any>(
  fn?: T,
  defaultValue?: Awaited<ReturnType<T>>
) => (...params: Parameters<T>) => ReturnType<T>;
