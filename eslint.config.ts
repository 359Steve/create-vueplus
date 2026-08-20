import antfu from '@antfu/eslint-config';

export default antfu(
    {
        vue: true,
        typescript: true,
        stylistic: {
            indent: 4,
            quotes: 'single',
            semi: true,
        },
        ignores: ['**/dist', '**/node_modules', '**/.vite', '**/auto-imports.d.ts', '**/components.d.ts'],
        rules: {
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'style/brace-style': 'off',
            'ts/no-empty-object-type': 'warn',
            'vue/html-self-closing': 'off',
            'antfu/if-newline': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/multiline-html-element-content-newline': 'off',
            'style/operator-linebreak': 'off',
            'style/arrow-parens': ['error', 'always'],
            'vue/html-indent': 'off',
            'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false }],
        },
    },
    {
        files: ['**/*.d.ts'],
        rules: {
            'unused-imports/no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-unused-vars': 'off',
        },
    },
);
