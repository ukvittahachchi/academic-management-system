import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    // Transpile is required for these packages in Next.js 15/16
    transpilePackages: ['react-pdf'],

    experimental: {
        // This helps handle the ESM imports correctly
        esmExternals: "loose",
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