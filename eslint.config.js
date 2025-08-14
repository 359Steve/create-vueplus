import { defineConfig } from '@soybeanjs/eslint-config'

export default defineConfig(
	{ vue: true },
	{
		files: ['**/*.{ts,tsx,vue}'],
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error', // 这里就能生效
				{
					vars: 'all',
					args: 'after-used',
					ignoreRestSiblings: true,
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	}
)
