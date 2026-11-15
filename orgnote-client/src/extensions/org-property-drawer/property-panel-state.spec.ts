import { expect, test } from 'vitest';
import {
  consumePropertyAddRowRequest,
  propertyAddRowRequests,
  requestPropertyAddRow,
} from './property-panel-state';

test('property panel state consumes pending add row requests once', () => {
  const stateKey = 'page:test-consume-once';

  requestPropertyAddRow(stateKey);

  expect(propertyAddRowRequests.value[stateKey]).toBeGreaterThan(0);
  expect(consumePropertyAddRowRequest(stateKey)).toBe(true);
  expect(consumePropertyAddRowRequest(stateKey)).toBe(false);
  expect(propertyAddRowRequests.value[stateKey]).toBeUndefined();
});

test('property panel state increments repeated add row requests', () => {
  const stateKey = 'headline:test-repeated';

  requestPropertyAddRow(stateKey);
  const firstRequestId = propertyAddRowRequests.value[stateKey] ?? 0;
  requestPropertyAddRow(stateKey);

  expect(propertyAddRowRequests.value[stateKey]).toBeGreaterThan(firstRequestId);
  expect(consumePropertyAddRowRequest(stateKey)).toBe(true);
});
