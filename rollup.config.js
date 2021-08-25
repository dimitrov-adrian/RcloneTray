import { main } from './package.json';

export default {
    input: 'src/index.js',
    output: {
        file: main,
        format: 'cjs',
        indent: false,
        inlineDynamicImports: true,
        compact: true,
    },
};
