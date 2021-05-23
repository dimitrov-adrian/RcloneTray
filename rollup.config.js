import commonjs from '@rollup/plugin-commonjs';

export default [
    {
        input: 'src/main.js',
        output: {
            file: 'main.packed.cjs',
            format: 'cjs',
            indent: false,
            strict: false,
        },

        plugins: [
            commonjs({
                ignoreGlobal: true,
            }),
        ],
    },
];
