import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importX from 'eslint-plugin-import-x'
import prettier from 'eslint-config-prettier/flat'

/**
 * The layer boundary (see src/README.md) is enforced here by three rules,
 * because no single one covers it:
 *
 *   - no-restricted-paths   catches relative imports that escape core/
 *   - no-restricted-imports catches the same escape written as an @/ alias,
 *                           which no-restricted-paths cannot resolve
 *   - no-restricted-globals catches browser APIs reached without any import
 *
 * The stronger, non-disableable half of the guarantee is tsconfig.core.json,
 * which typechecks src/core without the DOM lib.
 */
const uiLayers = ['app', 'components', 'features', 'state']

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'import-x': importX },
    settings: {
      // Without this the resolver never finds `../lib/storage/web` (no
      // extension, .ts file) and no-restricted-paths silently passes an
      // import it should reject.
      'import-x/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/core',
              from: [
                './src/app',
                './src/components',
                './src/features',
                './src/state',
                './src/lib',
              ],
              message:
                'src/core must not import from the UI or the browser adapters. Adapters are passed in, never imported — see src/README.md.',
            },
          ],
        },
      ],
    },
  },

  // Browser-facing code: React rules apply here and nowhere else.
  {
    files: ['src/{app,components,features,state,lib}/**/*.{ts,tsx}', 'src/*.tsx'],
    // `configs.flat` — the eslintrc-shaped `recommended-latest` at the top
    // level declares `plugins` as an array, which flat config rejects.
    extends: [reactHooks.configs.flat['recommended-latest']],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },

  // The core boundary.
  {
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-dom/*', 'zustand', 'zustand/*'],
              message: 'src/core must stay free of the UI framework — see src/README.md.',
            },
            {
              group: [...uiLayers, 'lib'].flatMap((l) => [`@/${l}`, `@/${l}/*`]),
              message:
                'src/core must not import from the UI or the browser adapters. Adapters are passed in, never imported — see src/README.md.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'localStorage',
          'sessionStorage',
          'navigator',
          'location',
          'alert',
          'indexedDB',
        ].map((name) => ({
          name,
          message: `src/core must run outside a browser: ${name} is not available under React Native. Take what you need as a parameter — see src/README.md.`,
        })),
      ],
    },
  },

  // Config files run in Node, not in the browser.
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  // Must stay last: switches off everything Prettier owns.
  prettier,
)
