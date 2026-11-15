import { expect, test } from 'vitest';
import { to } from '../to-error';
import { ok } from 'neverthrow';

test('to_returnsOk_whenSyncFunctionSucceeds', () => {
  const result = to(() => 42)();
  expect(result).toEqual(ok(42));
});

test('to_returnsErr_whenSyncFunctionThrows', () => {
  const result = to((): number => {
    throw new Error('boom');
  })();
  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('boom');
  }
});

test('to_usesCustomMapperFunction_whenProvided', () => {
  const mapper = (e: unknown) =>
    new Error(`Custom: ${e instanceof Error ? e.message : e}`);
  const result = to((): number => {
    throw new Error('boom');
  }, mapper)();
  expect(result.isErr()).toBe(true);
  if (result.isErr()) expect(result.error.message).toBe('Custom: boom');
});

test('to_wrapsErrorWithMessage_whenStringProvided', () => {
  const result = to((): number => {
    throw new Error('original error');
  }, 'Context message')();
  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error.message).toBe('Context message');
    expect((result.error.cause as Error).message).toBe('original error');
  }
});

test('to_returnsOk_whenPromiseResolves', async () => {
  const result = await to(async () => 42)();
  expect(result).toEqual(ok(42));
});

test('to_returnsErr_whenPromiseRejects', async () => {
  const result = await to(async (): Promise<number> => {
    throw new Error('async boom');
  })();
  expect(result.isErr()).toBe(true);
  if (result.isErr()) expect(result.error.message).toBe('async boom');
});

test('to_mapsAsyncErrors_whenMapperProvided', async () => {
  const result = await to(
    async (): Promise<number> => {
      throw new Error('async boom');
    },
    () => new Error('mapped async error')
  )();
  expect(result.isErr()).toBe(true);
  if (result.isErr()) expect(result.error.message).toBe('mapped async error');
});

test('to_passesArguments_toOriginalFunction', () => {
  const result = to((a: number, b: number) => a + b)(2, 3);
  expect(result).toEqual(ok(5));
});

test('to_passesArguments_toAsyncFunction', async () => {
  const result = await to(async (a: string) => `Hello ${a}`)('World');
  expect(result).toEqual(ok('Hello World'));
});

test('to_preservesThisContext', () => {
  class Calculator {
    constructor(private multiplier: number) {}
    multiply(value: number) {
      return value * this.multiplier;
    }
  }
  const calc = new Calculator(2);
  expect(to(calc.multiply.bind(calc))(3)).toEqual(ok(6));
});
