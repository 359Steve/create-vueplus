import antfu from '@antfu/eslint-config';

export default antfu({
    vue: true,
    typescript: true,
    stylistic: {
        indent: 4,
        quotes: 'single',
        semi: true,
    },
    ignores: ['**/dist', '**/node_modules', '**/.vite', '**/auto-imports.d.ts', '**/components.d.ts'],
    rules: {
        'unused-imports/no-unused-vars': 'warn',
        'style/brace-style': 'warn',
        'ts/no-empty-object-type': 'warn',
    },
});
