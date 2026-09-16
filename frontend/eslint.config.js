import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * This file didn't exist before — `npm run lint` (in package.json
 * since before this project's frontend/backend merge) had nothing to
 * actually run against. Added alongside the CI pipeline rather than
 * left as a silently-broken script now that something (CI) actually
 * depends on it working. Modeled on Vite's own react-ts template
 * config, which is the standard baseline for this exact stack (React
 * 19 + TypeScript + Vite) rather than a from-scratch rule set.
 */
export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // This codebase's own convention (see e.g. RiveInputs/ViewModelBridge
      // in riveInputBridge.ts) leans on `catch {}` blocks that
      // deliberately swallow an error with just a comment explaining
      // why — not a mistake worth flagging.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // This codebase's convention for an intentionally-discarded
      // destructured value (e.g. CombinedCharacterRenderer's
      // `state: _stateProp`) is a leading underscore, not deletion —
      // see that component's own doc comment for why the prop still
      // needs to be named in the destructure. Recognize that instead
      // of flagging it as dead code.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
