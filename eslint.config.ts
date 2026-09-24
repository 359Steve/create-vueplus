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
		ignores: ['**/dist', '**/node_modules', '**/.vite', '**/auto-imports.d.ts', '**/components.d.ts', 'public/**'],
		rules: {

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
