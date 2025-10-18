// ESLint v9 flat config for the monorepo
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importX from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import turbo from 'eslint-plugin-turbo'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'

export default [
  // Ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/build/**',
      '**/.wrangler/**',
      '**/.vite/**',
      '**/*.d.ts',
      'apps/**/routeTree.gen.ts',
      'apps/**/worker-configuration.d.ts',
    ],
  },

  // Base JS rules
  js.configs.recommended,


  importX.flatConfigs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React + Hooks + a11y for webapp
  {
    files: ['apps/webapp/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: { version: '19.2' },
      'import-x/core-modules': ['cloudflare:workers'],
    },
  },
  { files: ['apps/webapp/**/*.{ts,tsx}'], ...react.configs.flat.recommended },
  { files: ['apps/webapp/**/*.{ts,tsx}'], ...react.configs.flat['jsx-runtime'] },
  { files: ['apps/webapp/**/*.{ts,tsx}'], ...reactHooks.configs.flat['recommended-latest'] },
  {
    files: ['apps/webapp/**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'react/prop-types': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },

  // Cloudflare Workers code (backend-service)
  {
    files: ['apps/backend-service/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
    settings: {
      'import-x/core-modules': ['cloudflare:workers'],
    },
  },

  // Turbo repo plugin recommendations
  turbo.configs['flat/recommended'],

  // Import plugin TypeScript addon for TS files
  importX.flatConfigs.typescript,

  // Legacy resolver (works well across mono + TS paths)
  {
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
        },
      },
    },
  },

  // Per-package resolver pinning (ensures tsconfig discovery in each workspace)
  {
    files: ['packages/data-ops/**/*.{ts,tsx}'],
    settings: {
      'import-x/resolver': {
        typescript: { project: ['packages/data-ops/tsconfig.json'] },
      },
    },
  },
  {
    files: ['apps/backend-service/**/*.{ts,tsx}'],
    settings: {
      'import-x/resolver': {
        typescript: { project: ['apps/backend-service/tsconfig.json'] },
      },
    },
  },
  {
    files: ['apps/webapp/**/*.{ts,tsx}'],
    settings: {
      'import-x/resolver': {
        typescript: { project: ['apps/webapp/tsconfig.json'] },
      },
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Disable stylistic rules that conflict with Prettier
  eslintConfigPrettier,
]
