# Deploying supercellstats.com

Production architecture (no keys ever reach the browser, and the site
doesn't care that the origin server sits behind a residential dynamic IP):

```
visitor ──HTTPS──> Cloudflare (proxied DNS, CNAME -> ip.nixospace.it)
                    └─> Caddy on the home server
                         ├─ /            → static files from dist/ (unknown path = real 404)
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

    # Everything below the three /api/* handlers (security headers, asset cache,
    # prerendered shells, real 404) is the content of docs/caddy-tail.caddy,
    # applied by ~/crowdsec/10-supercellstats-caddy.sh. See "HTTP behaviour".
    # Do NOT use a catch-all `try_files {path} /index.html`: it answers 200 for
    # unknown URLs and for missing hashed chunks.
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
~/apps/supercellstats/scripts/deploy.sh              # deploy origin/main
~/apps/supercellstats/scripts/deploy.sh --rollback   # restore the previous build
```

The script builds into a scratch directory and swaps it in with a `mv`, so no
visitor can be served a half-written `dist/`. It keeps the previous build as
`dist.previous` and writes the deployed commit to `dist/VERSION`, so
`curl https://supercellstats.com/VERSION` answers "what is live".

Right after the swap the script copies the previous build's `assets/` files into
the new `dist/assets/` without overwriting anything, so a tab opened before the
deploy can still lazy-load its old chunks instead of hitting a 404. Only one older
generation is kept (the carried names are listed in `dist/assets/.carried`).
`scripts/carry-assets.test.sh` checks this on a temporary directory.

No Caddy reload is needed for frontend-only changes. **Apply the Cache-Control
rules in `docs/SERVER-HARDENING.md` before the first rebuild** — asset hashes
change on rebuild, and a client holding a stale `index.html` would request chunks
that no longer exist and get the SPA fallback (`200 text/html`) instead of a 404,
which renders as a blank page with nothing in the console.

Do not use a bare `git pull` here: that clone is checked out on a feature branch,
so it would pull the wrong ref.

## HTTP behaviour (production)

The part of the vhost below the three `/api/*` handlers is kept in
`docs/caddy-tail.caddy` and applied by `~/crowdsec/10-supercellstats-caddy.sh`
(run as root; it validates, reloads, smoke-tests and rolls back by itself).
The `/api/*` handlers hold the injected Authorization headers and are never touched.

| Route | Served as |
|---|---|
| `/assets/*` | hashed build output, `Cache-Control: public, max-age=31536000, immutable` |
| `/`, `/game/clash-royale`, `/game/brawl-stars`, `/game/clash-of-clans` | prerendered shell (`<path>/index.html`), revalidated on every load |
| `/game/<id>/player/<tag>` | SPA shell (`/index.html`), client-side routed |
| any other existing file (`/VERSION`, `/robots.txt`, ...) | the file itself |
| anything else | **HTTP 404** with the SPA shell as body, so React Router still renders its `NotFound` page |

Every response, 404s included, carries `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`,
`Strict-Transport-Security`, `Permissions-Policy` and a Content-Security-Policy (`handle_errors` repeats the same `header {}` block, because the vhost-level one
does not apply to error responses; keep the two identical). 404 responses are `Cache-Control: no-store`, so a
missing asset is never cached (even under `/assets/*`, whose `immutable` header is overridden). The build has no
inline scripts, hence `script-src 'self'`. Allowed external origins:

- styles: `fonts.googleapis.com`; fonts: `fonts.gstatic.com`
- images: `cdn.brawlify.com`, `cdn-old.brawlify.com`, `api-assets.clashroyale.com`, `api-assets.clashofclans.com`, `royaleapi.github.io` (plus `data:`)
- `connect-src 'self'` only: all API calls go through the same-origin `/api/*` proxy

To add a new CDN, add its origin to the right directive (`img-src`, `font-src`, ...) in
`docs/caddy-tail.caddy`, then re-run the apply script. A blocked resource shows up as a
`console:` failure in the e2e suite (`E2E_BASE_URL=https://supercellstats.com npm run e2e`).

Rollback to the Caddyfile saved before the change:

```bash
sudo cp "$(ls -t /etc/caddy/Caddyfile.bak-presupercell-* | head -1)" /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

## Notes

- The client sends no Authorization header in production; Caddy injects it.
- If Supercell ever rotates the whitelisted IP for the proxy (it happened
  once before — old IP `128.128.128.128` → current `45.79.218.79`), check
  https://docs.royaleapi.com/proxy.html and update the 3 developer-portal
  keys accordingly. This is the only manual step left, and it's rare.
- Consider a Cloudflare rate-limiting rule on `/api/*` to protect the
  per-key API quota from abusive visitors.
