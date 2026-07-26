import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Catches referencing a variable that isn't in scope. A module-level
      // component in App.jsx was passing `T={N}` where N only exists inside the
      // Dashboard component — every render threw and blanked the whole page, and
      // nothing flagged it because this rule was off. src/App.jsx is clean of
      // these now, so it will only ever fire on a newly introduced one.
      'no-undef': 'error',
    },
  },
  {
    // The scripts in scripts/ run under Node, not in a browser: they legitimately
    // use process, console and friends. Without this they'd trip no-undef.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
])
