import { test, expect } from 'vitest';
import { createPromise } from './create-promise';

test('createPromise should return a promise and a resolver', async () => {
  const [promise, resolver] = createPromise<string>();
  expect(promise).toBeInstanceOf(Promise);
  expect(typeof resolver).toBe('function');
});

test('createPromise should resolve the promise when resolver is called', async () => {
  const [promise, resolver] = createPromise<number>();
  resolver(42);
  await expect(promise).resolves.toBe(42);
});

test('createPromise should support generic types', async () => {
  interface CustomType {
    id: number;
    name: string;
  }
  const [promise, resolver] = createPromise<CustomType>();
  const result: CustomType = { id: 1, name: 'Test' };
  resolver(result);
  await expect(promise).resolves.toEqual(result);
});
