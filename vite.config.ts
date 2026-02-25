import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
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
            '/api/tracker': {
                target: 'https://public-api.tracker.gg/v2',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/tracker/, ''),
            }
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
