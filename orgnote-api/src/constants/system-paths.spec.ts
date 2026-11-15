import { expect, test } from 'vitest';
import {
  ORGNOTE_EXTENSION_RUNTIME_ROOT_PATH,
  ORGNOTE_SYSTEM_ROOT_PATH,
} from './system-paths';

test('extension runtime path is derived from the system root', () => {
  expect(ORGNOTE_EXTENSION_RUNTIME_ROOT_PATH).toBe(`${ORGNOTE_SYSTEM_ROOT_PATH}/extensions`);
});
