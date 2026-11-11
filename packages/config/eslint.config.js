import tseslint from 'typescript-eslint';

const ignores = {
  ignores: ['**/dist/**', '**/coverage/**', '**/.nx/**', '**/node_modules/**'],
};

const typeScriptFiles = ['**/*.{ts,tsx,mts,cts}'];
const javaScriptFiles = ['**/*.{js,mjs,cjs}'];

const typeAwareRules = {
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
  '@typescript-eslint/explicit-module-boundary-types': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/prefer-nullish-coalescing': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
};

const baseRules = {
  'no-var': 'error',
  'prefer-const': 'error',
  'no-empty': ['error', { allowEmptyCatch: false }],
  eqeqeq: ['error', 'always'],
};

/**
 * Shared flat config for every project in the workspace.
 * Type-aware rules run on TypeScript files; plain JavaScript (config files) gets syntax-only rules.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export const createConfig = ({ tsconfigRootDir }) =>
  tseslint.config(
    ignores,
    {
      files: typeScriptFiles,
      extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: { ...baseRules, ...typeAwareRules },
    },
    {
      files: javaScriptFiles,
      extends: [tseslint.configs.recommended, tseslint.configs.disableTypeChecked],
      rules: baseRules,
    },
  );

export default createConfig({ tsconfigRootDir: import.meta.dirname });
