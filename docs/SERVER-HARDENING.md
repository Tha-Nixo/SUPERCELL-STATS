# Server hardening — supercellstats.com

Everything here touches the **live server**, not this repo. Each step lists who
can run it. The site is served by Caddy on the home server, which also terminates
TLS for ~30 other vhosts — so every restart is a shared-blast-radius action.

Nothing in this document should be applied without reading it end to end first:
step 2 is a prerequisite for step 3, and doing 3 without 2 makes the problem
worse, not better.

---

## 1. The API keys are exposed — rotate them

**What is wrong.** `/etc/caddy/Caddyfile` is mode `644 root:root` — world-readable
by every account on the box — and contains all three Supercell API tokens inline,
in plaintext, in the `header_up Authorization "Bearer …"` lines of the three
`handle_path /api/*` blocks. Every timestamped `Caddyfile.bak-*` alongside it has
the same mode and the same tokens.

**Why the IP allowlist does not save you.** The tokens are allowlisted to
`45.79.218.79`, which is *RoyaleAPI's public relay*, not this server. Anyone
holding a leaked token can route it through `proxy.royaleapi.dev` exactly the way
this site does. The allowlist restricts the *path*, not the *holder*.

**Fix, in order:**

1. **Rotate all three tokens** on the developer portals — treat the current ones
   as burned. Keep the allowlist set to `45.79.218.79`.
   - <https://developer.clashroyale.com>
   - <https://developer.brawlstars.com>
   - <https://developer.clashofclans.com>

2. **Remove `--environ` from the Caddy unit first.** *(needs sudo)*
   The packaged unit runs `caddy run --environ …`, which dumps the entire process
   environment into the journal on startup. Move the tokens into the environment
   while that flag is set and they land in `journalctl` instead — same exposure,
   new location. Override with a drop-in; never edit the packaged unit:

   ```bash
   sudo systemctl edit caddy
   # [Service]
   # ExecStart=
   # ExecStart=/usr/bin/caddy run --config /etc/caddy/Caddyfile
   # EnvironmentFile=/etc/caddy/supercellstats.env
   ```

3. **Put the new tokens in a 0600 env file.** *(needs sudo)*

   ```bash
   sudo install -m 0600 -o root -g root /dev/null /etc/caddy/supercellstats.env
   sudo tee /etc/caddy/supercellstats.env >/dev/null <<'EOF'
   CR_API_TOKEN=<new clash royale token>
   BS_API_TOKEN=<new brawl stars token>
   COC_API_TOKEN=<new clash of clans token>
   EOF
   ```

4. **Replace the literals in the Caddyfile with placeholders.** *(needs sudo)*
   Only the three `header_up Authorization` lines change:

   ```caddyfile
   header_up Authorization "Bearer {env.CR_API_TOKEN}"    # /api/clash-royale/*
   header_up Authorization "Bearer {env.BS_API_TOKEN}"    # /api/brawl-stars/*
   header_up Authorization "Bearer {env.COC_API_TOKEN}"   # /api/clash-of-clans/*
   ```

   Back the file up with `install -m 0600` — not `cp`, which reproduces the
   world-readable mode that caused this.

5. **Validate, then restart — `reload` is not enough.** *(needs sudo)*
   A reload re-reads the config but keeps the old process environment, so the new
   variables would be empty and the three API routes would send a bare `Bearer `
   and fail silently.

   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl daemon-reload && sudo systemctl restart caddy
   for g in clash-royale brawl-stars clash-of-clans; do
     printf '%-16s %s\n' "$g" "$(curl -s -o /dev/null -w '%{http_code}' \
       "https://supercellstats.com/api/$g/players/%23RUQ0JU2P")"
   done
   ```

6. **Clean up the old copies.** *(needs sudo)*

   ```bash
   sudo shred -u /etc/caddy/Caddyfile.bak-*
   sudo chgrp caddy /etc/caddy/Caddyfile && sudo chmod 0640 /etc/caddy/Caddyfile
   ```

**Rollback:** restore the `.bak` and `systemctl restart caddy`. The rotated tokens
stay valid, so rolling back the config never re-exposes the old ones.

---

## 2. The relay is open — bound what it will forward

`/api/*` currently forwards any method and any path to Supercell with the owner's
credentials attached. A bot can walk it and spend the quota. The app only ever
issues six shapes of `GET`, so everything else can be rejected before the proxy:

```caddyfile
@api_badmethod {
    path /api/*
    not method GET
}
respond @api_badmethod 405

@api_badpath {
    path /api/*
    not path_regexp ^/api/(clash-royale|brawl-stars|clash-of-clans)/(players|clubs|cards|brawlers)/?
}
respond @api_badpath 404
```

Place both **before** the `handle_path` blocks (they match on the un-stripped
path). `cards` and `brawlers` are the catalog endpoints the app now calls once per
session to get real denominators — omitting them breaks the "x / 122 cards" line.

**Rate limiting is not available on this box as-is:** Caddy is 2.6.2 and has no
`rate_limit` handler. It needs a rebuild:

```bash
xcaddy build v2.10.2 --with github.com/mholt/caddy-ratelimit
sudo cp /usr/bin/caddy /usr/bin/caddy.2.6.2      # rollback path
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

Then, in the vhost — and **only** with `trusted_proxies` set for Cloudflare's
ranges, otherwise `{remote_host}` is Cloudflare's IP and the first burst rate-limits
every visitor at once:

```caddyfile
rate_limit {
    zone supercell_api {
        match { path /api/* }
        key {remote_host}
        events 30
        window 1m
    }
}
```

A Cloudflare rate-limiting rule on `/api/*` achieves the same thing with no
rebuild and no restart, and is the better first move.

---

## 3. Missing response headers

The live site sends no CSP, no `X-Content-Type-Options`, no `Referrer-Policy` and
no frame protection. The CSP below was checked against the built bundle: there are
no inline `<script>` tags, so `script-src 'self'` holds; `style-src` needs
`'unsafe-inline'` because motion writes inline styles; `connect-src 'self'` is
correct because every fetch goes to same-origin `/api/*`.

Ship it as **`Content-Security-Policy-Report-Only` for a week** before enforcing.

```caddyfile
header {
    Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://cdn.brawlify.com https://cdn-old.brawlify.com https://royaleapi.github.io https://api-assets.clashroyale.com https://api-assets.clashofclans.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    X-Frame-Options "DENY"
    Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()"
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    -Server
}
```

---

## 4. Caching — do this **before** the first rebuild

Hashed assets are currently served with a 4-hour `max-age` and `index.html` with
no cache directive at all, so browsers apply heuristic freshness to it. The moment
a rebuild changes the asset hashes, a client holding a stale `index.html` requests
chunks that no longer exist — and because of the SPA fallback it gets `200
text/html` instead of a 404, which parses as a blank page with nothing in the
console.

```caddyfile
@immutable path /assets/* /fonts/* /icons/* /og/*
header @immutable Cache-Control "public, max-age=31536000, immutable"

@images path /images/*
header @images Cache-Control "public, max-age=604800"

@html path / /index.html /game/* /VERSION
header @html Cache-Control "no-cache, must-revalidate"
```

`root *` must sit at the **vhost** level, next to `encode zstd gzip` — if it is
declared only inside the final `handle`, these matchers resolve against nothing
and every asset 404s.

Purge the Cloudflare cache once after applying.

---

## 5. Serving the per-route HTML shells

`npm run build` now emits `dist/game/<id>/index.html` with a distinct
title/description/canonical/OG per game. Caddy's current `try_files` never looks
for them:

```caddyfile
try_files {path} {path}/index.html /index.html
```

Without the middle term the shells are dead files and every route keeps serving
the generic root document. This is a one-word change to the existing directive;
the same pattern is already used by another vhost in this Caddyfile.

---

## 6. Deploy

`scripts/deploy.sh` replaces the manual `git pull && npm ci && npm run build`
documented in `DEPLOY.md`. It builds into a scratch directory and swaps it in with
a `mv`, so no visitor can hit a half-written `dist/`, and it keeps the previous
build for rollback.

```bash
~/apps/supercellstats/scripts/deploy.sh              # deploy origin/main
~/apps/supercellstats/scripts/deploy.sh --rollback   # restore the previous dist
```

Note the deploy clone at `~/apps/supercellstats` is currently checked out on
`fix/repo-overhaul`, so the `git pull` in the old instructions would have pulled
the wrong branch. `deploy.sh` checks out an explicit ref instead.

After deploying, `https://supercellstats.com/VERSION` answers "what is live".
