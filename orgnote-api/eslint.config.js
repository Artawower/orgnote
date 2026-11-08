import globals from 'globals';
import pluginJs from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    {
        plugins: { sonarjs },
        rules: {
            // TODO: feat/stable-beta enable before merge
            'sonarjs/no-commented-code': 'off',
        },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
];
