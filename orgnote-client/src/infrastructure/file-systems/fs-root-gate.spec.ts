import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withFsRootGate } from './fs-root-gate';
import type { FileSystem } from 'orgnote-api';

test('fs-root-gate has no node: or async_hooks imports for browser compatibility', () => {
  const filePath = path.resolve(__dirname, 'fs-root-gate.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  expect(content).not.toMatch(/node:|async_hooks/);
});

test('withFsRootGate serializes operations on the same fs and isolates different fs', async () => {
  const fs1 = {} as FileSystem;
  const fs2 = {} as FileSystem;

  const sequence: string[] = [];

  let resolveOp1: (() => void) | undefined;
  const op1Hold = new Promise<void>((resolve) => {
    resolveOp1 = resolve;
  });

  const p1 = withFsRootGate(fs1, async () => {
    sequence.push('fs1:op1:start');
    await op1Hold;
    sequence.push('fs1:op1:end');
  });

  const p2 = withFsRootGate(fs1, async () => {
    sequence.push('fs1:op2:start');
    sequence.push('fs1:op2:end');
  });

  const p3 = withFsRootGate(fs2, async () => {
    sequence.push('fs2:op1:start');
    sequence.push('fs2:op1:end');
  });

  await p3;
  expect(sequence).toEqual(['fs1:op1:start', 'fs2:op1:start', 'fs2:op1:end']);

  resolveOp1?.();
  await Promise.all([p1, p2]);

  expect(sequence).toEqual([
    'fs1:op1:start',
    'fs2:op1:start',
    'fs2:op1:end',
    'fs1:op1:end',
    'fs1:op2:start',
    'fs1:op2:end',
  ]);
});
