const config = require('@leanup/stack/.eslintrc');

config.overrides = config.overrides || [];
config.overrides.push({
	extends: ['plugin:react/recommended', 'plugin:jsx-a11y/recommended'],
	files: ['**/*.tsx'],
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
	},
	rules: {
		'@typescript-eslint/no-unsafe-argument': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'react/no-unused-state': 'error',
		'react/react-in-jsx-scope': 'off',
	},
});

config.plugins = config.plugins || [];
config.plugins.push('react');
config.plugins.push('jsx-a11y');

config.settings = {
	react: {
		version: 'detect',
	},
};

module.exports = config;
