import type { Result } from 'neverthrow';
import { ResultAsync, ok, err } from 'neverthrow';
import { isPresent } from './nullable-guards';

const defaultToError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

function isPromiseLike<T = unknown>(x: unknown): x is PromiseLike<T> {
  return (
    typeof x === 'object' &&
    isPresent(x) &&
    'then' in x &&
    typeof (x as { then?: unknown }).then === 'function'
  );
}

type MapperOrMsg<E> = ((e: unknown) => E) | string;

function resolveMapper<E>(map?: MapperOrMsg<E>): (e: unknown) => E {
  if (typeof map === 'function') return map as (e: unknown) => E;
  if (typeof map === 'string') {
    const msg = map;
    return (e: unknown) =>
      new Error(msg, { cause: e instanceof Error ? e : new Error(String(e)) }) as unknown as E;
  }
  return defaultToError as unknown as (e: unknown) => E;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function to<R, TThis = unknown, A extends any[] = any[], E = Error>(
  fn: (this: TThis, ...args: A) => Promise<R>,
  mapErrorOrMsg?: MapperOrMsg<E>,
): (this: TThis, ...args: A) => ResultAsync<R, E>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function to<R, TThis = unknown, A extends any[] = any[], E = Error>(
  fn: (this: TThis, ...args: A) => R,
  mapErrorOrMsg?: MapperOrMsg<E>,
): (this: TThis, ...args: A) => Result<R, E>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function to<R, TThis = unknown, A extends any[] = any[], E = Error>(
  fn: (this: TThis, ...args: A) => R | Promise<R>,
  mapErrorOrMsg?: MapperOrMsg<E>,
) {
  const mapError = resolveMapper<E>(mapErrorOrMsg);

  return function (this: TThis, ...args: A): Result<R, E> | ResultAsync<R, E> {
    try {
      const out = fn.apply(this, args);
      if (isPromiseLike<R>(out)) return ResultAsync.fromPromise(out, mapError);
      return ok(out) as Result<R, E>;
    } catch (e) {
      return err(mapError(e)) as Result<R, E>;
    }
  };
}
