# Deploying supercellstats.com

Production architecture (no keys ever reach the browser):

```
visitor ──HTTPS──> Cloudflare (proxied DNS) ──> Caddy on the home server
                                                 ├─ /            → static files from dist/
                                                 └─ /api/<game>/* → api.<game>.com/v1/*
                                                                    + Authorization header
                                                                    injected server-side
```

## 1. Build

```bash
npm ci && npm run build     # → dist/  (no VITE_* keys in the environment!)
```

Deploy path on the server: `/opt/projects/supercellstats/dist` (Caddy serves it directly).

## 2. Caddy vhost

```caddyfile
supercellstats.com {
    encode zstd gzip

    handle_path /api/clash-royale/* {
        rewrite * /v1{uri}
        reverse_proxy https://api.clashroyale.com {
            header_up Host api.clashroyale.com
            header_up Authorization "Bearer {$SUPERCELL_CR_KEY}"
        }
    }
    handle_path /api/brawl-stars/* {
        rewrite * /v1{uri}
        reverse_proxy https://api.brawlstars.com {
            header_up Host api.brawlstars.com
            header_up Authorization "Bearer {$SUPERCELL_BS_KEY}"
        }
    }
    handle_path /api/clash-of-clans/* {
        rewrite * /v1{uri}
        reverse_proxy https://api.clashofclans.com {
            header_up Host api.clashofclans.com
            header_up Authorization "Bearer {$SUPERCELL_COC_KEY}"
        }
    }

    handle {
        root * /opt/projects/supercellstats/dist
        try_files {path} /index.html   # SPA fallback
        file_server
    }
}

www.supercellstats.com {
    redir https://supercellstats.com{uri} permanent
}
```

Keys come from the systemd environment (e.g. a drop-in with
`EnvironmentFile=/etc/caddy/supercellstats.env`, file mode 600 root:root):

```
SUPERCELL_CR_KEY=...
SUPERCELL_BS_KEY=...
SUPERCELL_COC_KEY=...
```

## 3. DNS (Cloudflare)

- Add the `supercellstats.com` zone, switch nameservers at the registrar
- `A @ → <server WAN IP>` (or `CNAME @ → ip.nixospace.it`, flattened) — **proxied**
- `CNAME www → supercellstats.com` — **proxied**

## 4. Supercell developer portals

Create one key per game whitelisting the **server's public IP** (API calls
egress from the server, not from visitors):

- https://developer.clashroyale.com
- https://developer.brawlstars.com
- https://developer.clashofclans.com

If the home IP changes, update the keys in the portals.

## 5. Update procedure

```bash
cd /opt/projects/supercellstats && git pull && npm ci && npm run build
```

No Caddy reload needed for frontend-only changes.

## Notes

- The client sends no Authorization header in production; Caddy injects it.
- Consider a Cloudflare rate-limiting rule on `/api/*` to protect the
  per-key API quota from abusive visitors.
