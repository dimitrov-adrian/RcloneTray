import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nativePlugin from 'rollup-plugin-natives';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import { defineConfig } from 'rollup';

export default defineConfig({
	input: 'src/index.js',
	output: {
		file: './package/lib/bundle.cjs',
		format: 'cjs',
		indent: false,
		inlineDynamicImports: true,
		compact: true,
	},
	plugins: [
		nativePlugin({
			copyTo: './package/lib',
			destDir: './',
			sourcemap: false,
		}),
		nodeResolve({
			dedupe: ['semver'],
		}),
		commonjs(),
		json(),
		replace({
			preventAssignment: true,
			values: {
				'process.env.NODE_ENV': JSON.stringify('production'),
			},
		}),
		terser({
			compress: true,
			ecma: 2020,
		}),
	],
});
