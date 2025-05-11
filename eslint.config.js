import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: "module",
			},
			globals: {
				window: "readonly",
				document: "readonly",
				HTMLCanvasElement: "readonly",
				CanvasRenderingContext2D: "readonly",
				performance: "readonly",
				requestAnimationFrame: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": ts,
		},
		rules: {
			...js.configs.recommended.rules,
			...ts.configs.recommended.rules,
		},
	},
];
