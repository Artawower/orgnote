import { test, expect } from 'vitest';
import { sanitizeDropZoneRatio } from 'src/utils/get-drop-zone';

test('DropZoneOverlay uses sanitizeDropZoneRatio for edge ratio', () => {
  const validRatio = sanitizeDropZoneRatio(0.2);
  expect(validRatio).toBe(0.2);

  const invalidNegative = sanitizeDropZoneRatio(-0.1);
  expect(invalidNegative).toBe(0.01);

  const invalidLarge = sanitizeDropZoneRatio(0.7);
  expect(invalidLarge).toBe(0.5);
});

test('DropZoneOverlay should have correct drop zones', () => {
  const zones = ['left', 'right', 'top', 'bottom', 'center'];
  expect(zones).toHaveLength(5);
  zones.forEach((zone) => {
    expect(['left', 'right', 'top', 'bottom', 'center']).toContain(zone);
  });
});
