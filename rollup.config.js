import { defineConfig } from 'rollup';
import { main } from './package.json';

export default defineConfig({
	input: 'src/index.js',
	output: {
		file: main,
		format: 'cjs',
		indent: false,
		inlineDynamicImports: true,
		compact: true,
	},
});
