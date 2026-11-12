import { test, expect } from 'vitest';
import { hasIntersection } from './has-intersection';

test('hasIntersection returns false for non-overlapping ranges (range2 after range1)', () => {
  expect(hasIntersection(0, 10, 15, 20)).toBe(false);
});

test('hasIntersection returns false for non-overlapping ranges (range1 after range2)', () => {
  expect(hasIntersection(15, 20, 0, 10)).toBe(false);
});

test('hasIntersection returns true for overlapping ranges (range2 starts inside range1)', () => {
  expect(hasIntersection(0, 10, 5, 15)).toBe(true);
});

test('hasIntersection returns true for overlapping ranges (range1 starts inside range2)', () => {
  expect(hasIntersection(5, 15, 0, 10)).toBe(true);
});

test('hasIntersection returns true when range2 is completely inside range1', () => {
  expect(hasIntersection(0, 20, 5, 15)).toBe(true);
});

test('hasIntersection returns true when range1 is completely inside range2', () => {
  expect(hasIntersection(5, 15, 0, 20)).toBe(true);
});

test('hasIntersection returns true for identical ranges', () => {
  expect(hasIntersection(5, 15, 5, 15)).toBe(true);
});

test('hasIntersection returns true for touching ranges (end1 == start2)', () => {
  expect(hasIntersection(0, 10, 10, 20)).toBe(true);
});

test('hasIntersection returns true for touching ranges (start1 == end2)', () => {
  expect(hasIntersection(10, 20, 0, 10)).toBe(true);
});

test('hasIntersection handles negative numbers correctly', () => {
  expect(hasIntersection(-10, -5, -15, -11)).toBe(false);
  expect(hasIntersection(-10, -5, -6, -2)).toBe(true);
});

test('hasIntersection handles floating point numbers', () => {
  expect(hasIntersection(0.1, 0.5, 0.4, 0.8)).toBe(true);
  expect(hasIntersection(0.1, 0.5, 0.6, 0.9)).toBe(false);
});

test('hasIntersection handles zero values correctly', () => {
  expect(hasIntersection(0, 0, 0, 0)).toBe(true);
  expect(hasIntersection(-5, 0, 0, 5)).toBe(true);
});

test('hasIntersection handles single point intersections', () => {
  expect(hasIntersection(5, 5, 5, 5)).toBe(true);
});

test('hasIntersection normalizes range1 when start > end', () => {
  expect(hasIntersection(10, 0, 5, 15)).toBe(true);
});

test('hasIntersection normalizes range2 when start > end', () => {
  expect(hasIntersection(5, 15, 20, 10)).toBe(true);
});

test('hasIntersection returns true if start1 > end1 but start1 is inside range2', () => {
  expect(hasIntersection(50, 40, 0, 100)).toBe(true);
});

test('hasIntersection returns true if start2 > end2 but start2 is inside range1', () => {
  expect(hasIntersection(0, 100, 50, 40)).toBe(true);
});
