import { expect, test } from 'vitest';
import {
  parseExtensionFromFile,
  parseExtension,
  compileExtension,
} from './read-extension';

const manifestExample = {
  name: 'Test Extension',
  version: '1.0.0',
  permissions: ['files', '*'],
  category: 'other',
  source: { type: 'local' },
};

const validExtensionScript = `
  export default {
    execute() {},
  };
  export const manifest = ${JSON.stringify(manifestExample)};
`;

const invalidExtensionScript = `
  export const manifest = {
    name: 'Test Extension',
    version: '1.0.0'
  };
`;

test('parses extension from file', async () => {
  const file = new File([validExtensionScript], 'extension.js', { type: 'text/javascript' });
  const result = await parseExtensionFromFile(file);

  expect(result.manifest).toMatchObject(manifestExample);
  expect(typeof result.module.execute).toBe('function');
  expect(result.rawContent).toBe(validExtensionScript);
});

test('parses extension from string', async () => {
  const result = await parseExtension(validExtensionScript);

  expect(result.manifest).toMatchObject(manifestExample);
  expect(typeof result.module.execute).toBe('function');
  expect(result.rawContent).toBe(validExtensionScript);
});

test('compiles extension source without percent encoding', async () => {
  const result = await compileExtension(validExtensionScript);

  expect(typeof result.execute).toBe('function');
});

test('throws error for invalid script in parseExtension', async () => {
  await expect(parseExtension(invalidExtensionScript)).rejects.toThrow();
});

test('throws error for syntactically invalid script in compileExtension', async () => {
  const invalidSyntaxScript = 'export default { invalid syntax here';
  await expect(compileExtension(invalidSyntaxScript)).rejects.toThrow();
});
