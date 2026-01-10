import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import unicorn from 'eslint-plugin-unicorn';

export default [
  // Base configs
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...eslintPluginAstro.configs.recommended,

  // Language options
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Unicorn plugin with selective rules
  {
    plugins: {
      unicorn,
    },
    rules: {
      // Prefer modern Node.js imports
      'unicorn/prefer-node-protocol': 'error',

      // Prefer for...of over forEach
      'unicorn/no-array-for-each': 'error',

      // Prefer .at() for array access
      'unicorn/prefer-at': 'error',

      // Explicit length checks
      'unicorn/explicit-length-check': 'error',

      // Prefer modern DOM APIs
      'unicorn/prefer-query-selector': 'error',

      // Prefer modern array methods
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-some': 'error',

      // Prefer ternary over if/else when assigning
      'unicorn/prefer-ternary': ['error', 'only-single-line'],

      // Better error handling
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/throw-new-error': 'error',

      // Code quality
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',

      // Consistency
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-regexp-test': 'error',

      // DISABLED: These conflict with Astro conventions
      // 'unicorn/filename-case': 'off', - [slug].astro, PascalCase components
      // 'unicorn/prevent-abbreviations': 'off', - props, src are standard
      // 'unicorn/no-null': 'off', - Astro APIs use null
    },
  },

  // TypeScript overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },

  // Astro-specific overrides
  // TypeScript ESLint cannot infer types from Astro.props or content collections
  // Astro has its own type system via `astro check` which handles this correctly
  {
    files: ['**/*.astro'],
    rules: {
      // Astro components often have unused props passed to child components
      '@typescript-eslint/no-unused-vars': 'off',

      // Astro frontmatter already supports top-level await
      'unicorn/prefer-top-level-await': 'off',

      // Astro.props and content collections are typed by Astro, not inferable by ESLint
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // Config files can be looser
  {
    files: ['*.config.js', '*.config.ts', '*.config.mjs'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Astro-generated type definitions
  {
    files: ['src/env.d.ts'],
    rules: {
      // Astro requires triple-slash references for type definitions
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // JavaScript/TypeScript files with Astro APIs (feed.xml.js, robots.txt.ts)
  {
    files: ['src/pages/**/*.js', 'src/pages/**/*.ts'],
    rules: {
      // Astro context (this.site, etc.) is typed by Astro
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.astro/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'scripts/',
      'test-output/',
    ],
  },
];
