import commonjs from '@rollup/plugin-commonjs';

export default [
    {
        input: 'src/index.js',
        output: {
            file: 'bundle.cjs',
            format: 'cjs',
            indent: false,
            strict: false,
            inlineDynamicImports: true,
        },

        plugins: [
            commonjs({
                sourceMap: false,
                ignoreGlobal: true,
            }),
        ],
    },
];
