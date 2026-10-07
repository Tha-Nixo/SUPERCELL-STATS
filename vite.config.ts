import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    },
    server: {
        // Dev-only proxy: keeps the Supercell API keys usable from localhost.
        // Targets RoyaleAPI's fixed-IP relay (see DEPLOY.md) instead of the
        // Supercell APIs directly, so dev keys (whitelisted to 45.79.218.79)
        // work the same way behind a residential dynamic IP as in production.
        proxy: {
            '/api/clash-royale': {
                target: 'https://proxy.royaleapi.dev/v1',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/clash-royale/, ''),
            },
            '/api/brawl-stars': {
                target: 'https://bsproxy.royaleapi.dev/v1',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/brawl-stars/, ''),
            },
            '/api/clash-of-clans': {
                target: 'https://cocproxy.royaleapi.dev/v1',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/clash-of-clans/, ''),
            },
        }
    },
    preview: {
        // `vite preview` serves the production build, which by design carries no
        // API key. Borrow the deployed origin's proxy so a release can be smoke
        // tested against real data before it is deployed.
        proxy: {
            '/api': {
                target: 'https://supercellstats.com',
                changeOrigin: true,
            },
        },
    },
    build: {
        // scripts/check-bundle.mjs reads dist/.vite/manifest.json to know which
        // chunks each route needs (performance budget).
        manifest: true,
        rollupOptions: {
            output: {
                // Match on the resolved module path, not on the bare specifier:
                // the id-array form missed deep imports like `react-dom/client`
                // and `scheduler`, which then leaked into whichever chunk pulled
                // them in first.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;
                    if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react';
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
