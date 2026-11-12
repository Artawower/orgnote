import { expect, test } from 'vitest';
import {
  parseConfig,
  getFileExtension,
  isSupportedConfigFile,
  SUPPORTED_CONFIG_EXTENSIONS,
} from './config-parsers';

test('getFileExtension returns extension with dot', () => {
  expect(getFileExtension('manifest.toml')).toBe('.toml');
  expect(getFileExtension('config.json')).toBe('.json');
});

test('getFileExtension returns extension for nested paths', () => {
  expect(getFileExtension('path/to/file.toml')).toBe('.toml');
  expect(getFileExtension('/absolute/path/config.json')).toBe('.json');
});

test('getFileExtension normalizes extension to lowercase', () => {
  expect(getFileExtension('MANIFEST.TOML')).toBe('.toml');
  expect(getFileExtension('Config.JSON')).toBe('.json');
});

test('getFileExtension returns empty string when no extension', () => {
  expect(getFileExtension('Makefile')).toBe('');
  expect(getFileExtension('path/to/file')).toBe('');
});

test('getFileExtension handles multiple dots correctly', () => {
  expect(getFileExtension('file.spec.ts')).toBe('.ts');
  expect(getFileExtension('archive.tar.gz')).toBe('.gz');
});

test('isSupportedConfigFile returns true for supported extensions', () => {
  expect(isSupportedConfigFile('manifest.toml')).toBe(true);
  expect(isSupportedConfigFile('config.json')).toBe(true);
});

test('isSupportedConfigFile returns true for supported extensions regardless of case', () => {
  expect(isSupportedConfigFile('MANIFEST.TOML')).toBe(true);
  expect(isSupportedConfigFile('CONFIG.JSON')).toBe(true);
});

test('isSupportedConfigFile returns false for unsupported extensions', () => {
  expect(isSupportedConfigFile('script.js')).toBe(false);
  expect(isSupportedConfigFile('readme.md')).toBe(false);
  expect(isSupportedConfigFile('Makefile')).toBe(false);
});

test('SUPPORTED_CONFIG_EXTENSIONS contains toml and json', () => {
  expect(SUPPORTED_CONFIG_EXTENSIONS).toContain('.toml');
  expect(SUPPORTED_CONFIG_EXTENSIONS).toContain('.json');
});

test('parseConfig parses JSON content correctly', () => {
  const content = '{"name": "test", "version": "1.0.0"}';
  const result = parseConfig<{ name: string; version: string }>(content, 'config.json');

  expect(result.name).toBe('test');
  expect(result.version).toBe('1.0.0');
});

test('parseConfig parses TOML content correctly', () => {
  const content = `
name = "test"
version = "1.0.0"
`;
  const result = parseConfig<{ name: string; version: string }>(content, 'manifest.toml');

  expect(result.name).toBe('test');
  expect(result.version).toBe('1.0.0');
});

test('parseConfig parses content when extension is uppercase', () => {
  const jsonContent = '{"name": "test"}';
  const tomlContent = 'name = "test"';

  expect(parseConfig<{ name: string }>(jsonContent, 'CONFIG.JSON').name).toBe('test');
  expect(parseConfig<{ name: string }>(tomlContent, 'MANIFEST.TOML').name).toBe('test');
});

test('parseConfig throws for unsupported extension', () => {
  expect(() => parseConfig('content', 'file.yaml')).toThrow('Unsupported config format: .yaml');
});

test('parseConfig throws for invalid JSON', () => {
  expect(() => parseConfig('invalid json', 'config.json')).toThrow();
});

test('parseConfig throws for invalid TOML', () => {
  expect(() => parseConfig('invalid = [toml', 'config.toml')).toThrow();
});
