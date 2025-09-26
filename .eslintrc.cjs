module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:svelte/recommended',
		'plugin:cypress/recommended',
		'prettier'
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtensions: ['.svelte']
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		},
		{
			files: ['src/lib/artifacts/**/*.ts', 'src/lib/services/**/*.ts', 'src/lib/types/**/*.ts'],
			rules: {
				'@typescript-eslint/no-explicit-any': 'warn',
				'@typescript-eslint/no-unused-vars': 'error',
				'@typescript-eslint/explicit-function-return-type': 'warn',
				'no-console': 'warn',
				'prefer-const': 'error'
			}
		},
		{
			files: ['tests/**/*.ts', 'tests/**/*.js'],
			env: {
				jest: true,
				node: true
			},
			rules: {
				'@typescript-eslint/no-explicit-any': 'off',
				'no-console': 'off'
			}
		}
	]
};
