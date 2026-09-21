import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

// Component ownership (ROADMAP ownership map, DECISIONS D-17). Every file under src/lib and
// tests must belong to one of these folders; add a folder here before creating it.
const sourceElements = [
	'contracts',
	'storylines',
	'shapes',
	'engine',
	'persistence',
	'ui',
	'classification'
];
const testElements = [...sourceElements, 'app', 'integration', 'e2e'];

const elements = [
	...sourceElements.map((name) => ({ type: name, pattern: `src/lib/${name}` })),
	{ type: 'app', pattern: 'src/lib/app' },
	{ type: 'app', pattern: 'src/routes' },
	...testElements.map((name) => ({ type: `test-${name}`, pattern: `tests/${name}` }))
];

/** @param {string} from @param {string[]} to */
const allow = (from, to) => ({
	from: { element: { type: from } },
	allow: { to: { element: { types: { anyOf: to } } } }
});

const everySourceElement = [...sourceElements, 'app'];

// Frozen import boundaries: pure components depend only on contracts; the app composes all.
const policies = [
	allow('contracts', ['contracts']),
	allow('storylines', ['storylines', 'contracts']),
	allow('shapes', ['shapes']),
	allow('engine', ['engine', 'contracts']),
	allow('persistence', ['persistence', 'contracts']),
	allow('ui', ['ui', 'contracts', 'shapes']),
	allow('classification', ['classification', 'contracts']),
	allow('app', everySourceElement),
	allow('test-contracts', ['test-contracts', 'contracts', 'storylines', 'shapes']),
	allow('test-storylines', ['test-storylines', 'storylines', 'contracts', 'engine', 'shapes']),
	allow('test-engine', ['test-engine', 'engine', 'contracts', 'storylines']),
	allow('test-persistence', ['test-persistence', 'persistence', 'contracts', 'storylines']),
	allow('test-ui', ['test-ui', 'ui', 'contracts', 'storylines']),
	allow('test-classification', [
		'test-classification',
		'classification',
		'contracts',
		'storylines'
	]),
	allow('test-app', ['test-app', ...everySourceElement]),
	allow('test-integration', ['test-integration', ...everySourceElement]),
	allow('test-e2e', ['test-e2e', ...everySourceElement])
];

const nodeBuiltins = {
	group: ['node:*'],
	message: 'Browser code must not import Node built-ins.'
};

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommendedTypeChecked,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				projectService: { allowDefaultProject: ['playwright.config.ts'] },
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte']
			}
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		files: ['**/*.js'],
		extends: [ts.configs.disableTypeChecked]
	},
	{
		// Spike scripts run on Bun/Node and stay outside the app tsconfig project.
		files: ['spikes/**/*.mjs'],
		extends: [ts.configs.disableTypeChecked]
	},
	{
		files: ['src/**/*.ts', 'src/**/*.svelte', 'tests/**/*.ts', 'tests/**/*.svelte'],
		plugins: { boundaries },
		settings: {
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: './tsconfig.json',
					extensions: ['.ts', '.svelte', '.js', '.json', '.d.ts']
				}
			},
			'boundaries/elements': elements,
			// SvelteKit's generated route types resolve through tsconfig rootDirs, which the
			// resolver does not follow; they are generated declarations, not a component.
			'boundaries/flag-as-external': { customSourcePatterns: ['./$types'] }
		},
		rules: {
			'boundaries/dependencies': ['error', { default: 'disallow', policies }],
			'boundaries/no-unknown-dependencies': 'error'
		}
	},
	{
		files: ['src/lib/**', 'tests/**'],
		plugins: { boundaries },
		settings: { 'boundaries/elements': elements },
		rules: { 'boundaries/no-unknown-files': 'error' }
	},
	{
		files: ['src/**/*.ts', 'src/**/*.svelte'],
		rules: { 'no-restricted-imports': ['error', { patterns: [nodeBuiltins] }] }
	},
	{
		// Contracts, storylines, shapes, engine, and persistence stay framework-free (DECISIONS D-08).
		files: [
			'src/lib/contracts/**',
			'src/lib/storylines/**',
			'src/lib/shapes/**',
			'src/lib/engine/**',
			'src/lib/persistence/**'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						nodeBuiltins,
						{
							group: ['svelte', 'svelte/*', '$app/*', '$env/*', '@sveltejs/*', '$lib', '$lib/*'],
							message:
								'Pure components stay framework-free and use relative imports so Bun scripts and workers can load them.'
						}
					]
				}
			]
		}
	}
);
