import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // Dev-only proxy: keeps the Supercell API keys usable from localhost
        // (the browser cannot call api.*.com directly: CORS + IP-bound keys).
        // Production needs a real backend proxy — see GitHub issues #2/#3.
        proxy: {
            '/api/clash-royale': {
                target: 'https://api.clashroyale.com/v1',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/clash-royale/, ''),
            },
            '/api/brawl-stars': {
                target: 'https://api.brawlstars.com/v1',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/brawl-stars/, ''),
            },
            '/api/clash-of-clans': {
                target: 'https://api.clashofclans.com/v1',
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
