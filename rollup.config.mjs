import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";

export default {
	input: "src/index.ts",
	output: [
		{
			file: "dist/index.esm.js",
			format: "esm",
			sourcemap: true,
		},
		{
			file: "dist/index.cjs.js",
			format: "cjs",
			sourcemap: true,
		},
	],
	plugins: [
		resolve(),
		commonjs(),
		typescript({
			tsconfig: "./tsconfig.json",
			useTsconfigDeclarationDir: true,
			clean: true,
			tsconfigDefaults: {
				compilerOptions: {
					sourceMap: true,
					declaration: true,
					declarationMap: false,
				},
			},
		}),
		terser(),
	],
};
