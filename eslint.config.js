import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 核心防御：禁止在 core 或 ui 里乱引入
      'no-restricted-imports': [
        'error',
        {
          patterns: ['react', 'vue', 'svelte', 'styled-components']
        }
      ]
    }
  }
);