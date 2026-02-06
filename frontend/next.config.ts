import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    // Transpile is required for these packages in Next.js 15/16
    transpilePackages: ['react-pdf'],

    // Silences the warning about multiple lockfiles by setting the project root explicitly
    outputFileTracingRoot: path.join(__dirname, '../'),

    experimental: {
        // @ts-expect-error - React Compiler is standard in Next 15+ but types may lag
        reactCompiler: true,
        turbo: {
            resolveAlias: {
                canvas: './lib/empty-module.ts', // Turbo doesn't support 'false' yet, pointing to empty file
                'pdfjs-dist': 'pdfjs-dist/build/pdf.mjs',
            },
        },
    },

    webpack: (config) => {
        // Critical: prevents server-side crash requiring 'canvas'
        config.resolve.alias.canvas = false;

        // Force use of the main pdfjs-dist build to avoid version mismatches and duplicates
        config.resolve.alias['pdfjs-dist'] = path.join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.mjs');

        return config;
    },
};

export default nextConfig;