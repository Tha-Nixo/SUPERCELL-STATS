# Deploying supercellstats.com

Production architecture (no keys ever reach the browser, and the site
doesn't care that the origin server sits behind a residential dynamic IP):

```
visitor ──HTTPS──> Cloudflare (proxied DNS, CNAME -> ip.nixospace.it)
                    └─> Caddy on the home server
                         ├─ /            → static files from dist/
                         └─ /api/<game>/* → *.royaleapi.dev
                                            (fixed-IP relay, whitelisted once)
                                            + Authorization header
                                              injected server-side
                                            → forwards to api.<game>.com
```

## Why RoyaleAPI's proxy instead of calling api.\*.com directly

Supercell API keys are whitelisted to a single IP. This server's WAN IP is
dynamic (DDNS via `ip.nixospace.it`), so whitelisting it directly would mean
the keys silently break every time the ISP rotates the lease.

[RoyaleAPI](https://docs.royaleapi.com/proxy.html) — already used elsewhere
in this codebase as an asset fallback CDN — runs a public relay with a fixed
IP for exactly this problem: you whitelist *their* IP once, forever, and
route calls through their hostname instead of Supercell's. Same paths, same
`Authorization: Bearer <key>` header, only the hostname changes:

| Game | Direct (don't use) | Through the proxy |
|---|---|---|
| Clash Royale | `api.clashroyale.com` | `proxy.royaleapi.dev` |
| Brawl Stars | `api.brawlstars.com` | `bsproxy.royaleapi.dev` |
| Clash of Clans | `api.clashofclans.com` | `cocproxy.royaleapi.dev` |

**Whitelist IP for all 3 keys: `45.79.218.79`** (not the server's own IP).

This is deliberately *not* the same as the shady "auto-relogin and re-whitelist
my own IP with a script" tools that exist in the community (they require
storing your real Supercell ID password server-side and are explicitly
against Supercell's informal guidance). Nothing of ours is shared with
RoyaleAPI beyond normal API traffic; our own official keys never change.

If RoyaleAPI's uptime/trust is ever a concern, the fallback is self-hosting
an equivalent tiny reverse proxy on any box with a stable IP (e.g. a
free-tier cloud VM) and whitelisting that IP instead — same idea, fully
self-owned.

## 1. Get the API keys

Create one key per game on the developer portals, **IP allowlist = `45.79.218.79`**:

- https://developer.clashroyale.com
- https://developer.brawlstars.com
- https://developer.clashofclans.com

## 2. Build

```bash
npm ci && npm run build     # → dist/  (no VITE_* keys in the environment!)
```

Deploy path on the server: `~/apps/supercellstats/dist` (Caddy serves it directly).

## 3. Caddy vhost

```caddyfile
supercellstats.com {
    encode zstd gzip

    handle_path /api/clash-royale/* {
        rewrite * /v1{uri}
        reverse_proxy https://proxy.royaleapi.dev {
            header_up Host proxy.royaleapi.dev
            header_up Authorization "Bearer {$SUPERCELL_CR_KEY}"
        }
    }
    handle_path /api/brawl-stars/* {
        rewrite * /v1{uri}
        reverse_proxy https://bsproxy.royaleapi.dev {
            header_up Host bsproxy.royaleapi.dev
            header_up Authorization "Bearer {$SUPERCELL_BS_KEY}"
        }
    }
    handle_path /api/clash-of-clans/* {
        rewrite * /v1{uri}
        reverse_proxy https://cocproxy.royaleapi.dev {
            header_up Host cocproxy.royaleapi.dev
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

## 4. DNS (Cloudflare)

Dynamic, no manual maintenance:

- `CNAME @ → ip.nixospace.it` — proxied (Cloudflare flattens the apex CNAME)
- `CNAME www → ip.nixospace.it` — proxied
- SSL/TLS mode: Full

`ip.nixospace.it` is kept current by the `cloudflare-ddns` container already
running on the server — nothing game-specific to maintain here.

## 5. Update procedure

```bash
cd ~/apps/supercellstats && git pull && npm ci && npm run build
```

No Caddy reload needed for frontend-only changes.

## Notes

- The client sends no Authorization header in production; Caddy injects it.
- If Supercell ever rotates the whitelisted IP for the proxy (it happened
  once before — old IP `128.128.128.128` → current `45.79.218.79`), check
  https://docs.royaleapi.com/proxy.html and update the 3 developer-portal
  keys accordingly. This is the only manual step left, and it's rare.
- Consider a Cloudflare rate-limiting rule on `/api/*` to protect the
  per-key API quota from abusive visitors.
