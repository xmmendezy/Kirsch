module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	env: {
		browser: true,
		node: true,
		es6: true,
	},
	parserOptions: {
		ecmaFeatures: {
			modules: true,
			jsx: true,
		},
	},
	globals: {},
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	overrides: [
		{
			files: ['src/**/*.{ts,tsx,js,jsx}', 'gulpfile.ts'],
			rules: {
				semi: [1, 'always'],
				'comma-dangle': ['error', 'always-multiline'],
				indent: ['error', 'tab', { SwitchCase: 1 }],
				'max-lines': ['error', 2000],
				quotes: ['error', 'single'],
				'prefer-const': 'error',
				'no-var': 'error',
				camelcase: 'off',
				'prettier/prettier/arrow-parens': 'off',
				'@typescript-eslint/no-explicit-any': 'off',
				'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
				'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
			},
		},
	],
};
