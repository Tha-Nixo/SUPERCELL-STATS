import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
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
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router'],
                    charts: ['recharts'],
                    motion: ['motion'],
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
