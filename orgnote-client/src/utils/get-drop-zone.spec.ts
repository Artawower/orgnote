import { test, expect } from 'vitest';
import { getDropZone, sanitizeDropZoneRatio } from './get-drop-zone';

const createRect = (width = 100, height = 100, left = 0, top = 0): DOMRect => ({
  width,
  height,
  left,
  top,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({}),
});

test('should detect left zone', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(5, 50, rect, 0.2);
  expect(zone).toBe('left');
});

test('should detect right zone', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(95, 50, rect, 0.2);
  expect(zone).toBe('right');
});

test('should detect top zone', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(50, 5, rect, 0.2);
  expect(zone).toBe('top');
});

test('should detect bottom zone', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(50, 95, rect, 0.2);
  expect(zone).toBe('bottom');
});

test('should detect center zone', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(50, 50, rect, 0.2);
  expect(zone).toBe('center');
});

test('should detect zone at edge boundaries', () => {
  const rect = createRect(100, 100);
  const leftEdge = getDropZone(19, 50, rect, 0.2);
  expect(leftEdge).toBe('left');

  const rightEdge = getDropZone(81, 50, rect, 0.2);
  expect(rightEdge).toBe('right');

  const topEdge = getDropZone(50, 19, rect, 0.2);
  expect(topEdge).toBe('top');

  const bottomEdge = getDropZone(50, 81, rect, 0.2);
  expect(bottomEdge).toBe('bottom');
});

test('should handle coordinates with offset rect', () => {
  const rect = createRect(100, 100, 50, 50);
  const zone = getDropZone(55, 100, rect, 0.2);
  expect(zone).toBe('left');
});

test('should prioritize left/right over top/bottom', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(5, 5, rect, 0.2);
  expect(zone).toBe('left');
});

test('should sanitize negative ratio to 0.01', () => {
  const result = sanitizeDropZoneRatio(-0.5);
  expect(result).toBe(0.01);
});

test('should sanitize zero ratio to 0.01', () => {
  const result = sanitizeDropZoneRatio(0);
  expect(result).toBe(0.01);
});

test('should sanitize ratio greater than 0.5 to 0.5', () => {
  const result = sanitizeDropZoneRatio(0.8);
  expect(result).toBe(0.5);
});

test('should allow valid ratios between 0.01 and 0.5', () => {
  expect(sanitizeDropZoneRatio(0.1)).toBe(0.1);
  expect(sanitizeDropZoneRatio(0.25)).toBe(0.25);
  expect(sanitizeDropZoneRatio(0.3)).toBe(0.3);
  expect(sanitizeDropZoneRatio(0.5)).toBe(0.5);
});

test('should handle NaN ratio', () => {
  const result = sanitizeDropZoneRatio(NaN);
  expect(result).toBe(0.01);
});

test('should handle Infinity ratio', () => {
  const result = sanitizeDropZoneRatio(Infinity);
  expect(result).toBe(0.01);
});

test('should handle negative Infinity ratio', () => {
  const result = sanitizeDropZoneRatio(-Infinity);
  expect(result).toBe(0.01);
});

test('should use sanitized ratio in getDropZone', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(0.5, 50, rect, -0.5);
  expect(zone).toBe('left');
});

test('should handle very small valid ratio', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(0.5, 50, rect, 0.01);
  expect(zone).toBe('left');
});

test('should handle maximum valid ratio', () => {
  const rect = createRect(100, 100);
  const zone = getDropZone(25, 50, rect, 0.5);
  expect(zone).toBe('left');

  const center = getDropZone(50, 50, rect, 0.5);
  expect(center).toBe('center');
});
