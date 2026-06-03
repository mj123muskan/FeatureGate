# FeatureGate

A small, self-hostable, **typed feature-flag / remote-config service**. Manage flags from a simple Svelte UI, read them from any app in any language over a tiny REST API.

- **Typed flags** — `boolean`, `string`, `number`, `json`.
- **On / off + value** — every flag has an `enabled` switch and a typed `value`.
- **Multi-project** — each project gets its own read-only API key.
- **Pluggable storage** — a JSON file out of the box, or Postgres for production.
- **Language-agnostic** — flags are served as plain JSON over HTTP; works with curl, JS, Python, Go, anything.
- **Deployable standalone** — runs as a Node server (`adapter-node`) or on any SvelteKit-supported host.

---

## Quick start

```bash
pnpm install
cp .env.example .env          # then set ADMIN_TOKEN to something secret
pnpm dev                      # http://localhost:5173
```

Open the URL, sign in with your `ADMIN_TOKEN`, create a project, and add flags.

### Production

Ships with `@sveltejs/adapter-vercel` (Node 22). Deploy to Vercel (see below) or
swap the adapter in `svelte.config.js` for `@sveltejs/adapter-node` to run it as a
standalone Node server elsewhere.

---

## Configuration

| Env            | Default            | Purpose                                              |
| -------------- | ------------------ | ---------------------------------------------------- |
| `ADMIN_TOKEN`  | _(none)_           | Secret to sign in / call the admin API. **Required.**|
| `STORE`        | `file`             | `file` or `postgres`.                                |
| `DATA_FILE`    | `data/flags.json`  | JSON file path when `STORE=file`.                    |
| `DATABASE_URL` | _(none)_           | Postgres connection string when `STORE=postgres`.    |

With `STORE=postgres` the service creates its own `fg_projects` and `fg_flags`
tables on first run.

---

## Client API (read flags)

One endpoint, authenticated with a project's read key. Send the key as a header
(`x-api-key`) or query param (`?apiKey=`).

```
GET /api/v1/flags
```

```bash
curl -H "x-api-key: fg_xxx" https://your-host/api/v1/flags
```

Response:

```json
{
  "project": "my-app",
  "flags": {
    "checkout.v2":      { "type": "boolean", "value": true,  "enabled": true  },
    "hero.copy":        { "type": "string",  "value": "Hi!", "enabled": true  },
    "max.items":        { "type": "number",  "value": 25,    "enabled": false },
    "pricing.tiers":    { "type": "json",    "value": { "pro": 9 }, "enabled": true }
  }
}
```

`enabled` is the on/off switch; `value` is the typed payload. A typical gate
checks `enabled`; a remote-config read uses `value`. Responses are CORS-enabled
and cached for 15s.

### Use it anywhere

**JavaScript / TypeScript**

```ts
const res = await fetch('https://your-host/api/v1/flags', {
  headers: { 'x-api-key': process.env.FG_KEY! }
});
const { flags } = await res.json();

if (flags['checkout.v2']?.enabled) {
  // ...new checkout
}
const max = flags['max.items']?.value ?? 10;
```

**Python**

```python
import requests
flags = requests.get(
    "https://your-host/api/v1/flags",
    headers={"x-api-key": FG_KEY},
).json()["flags"]

if flags.get("checkout.v2", {}).get("enabled"):
    ...
```

**Go**

```go
req, _ := http.NewRequest("GET", "https://your-host/api/v1/flags", nil)
req.Header.Set("x-api-key", fgKey)
// decode resp.Body into a map[string]Flag
```

---

## Admin API

All admin routes require the cookie set by signing in. The UI uses these under
the hood:

| Method   | Path                                          | Action               |
| -------- | --------------------------------------------- | -------------------- |
| `POST`   | `/api/admin/auth`                             | Sign in (sets cookie)|
| `POST`   | `/api/admin/sign-out`                         | Sign out             |
| `GET`    | `/api/admin/projects`                         | List projects        |
| `POST`   | `/api/admin/projects`                         | Create project       |
| `DELETE` | `/api/admin/projects/:id`                     | Delete project       |
| `POST`   | `/api/admin/projects/:id/flags`               | Create flag          |
| `PATCH`  | `/api/admin/projects/:id/flags/:key`          | Update flag          |
| `DELETE` | `/api/admin/projects/:id/flags/:key`          | Delete flag          |

---

## Deploy on Vercel (with Postgres)

The file store lives on local disk and is **not** persisted on serverless, so
production must use `STORE=postgres`. The service creates its own `fg_projects`
and `fg_flags` tables on first request — no migration step.

1. **Get a Postgres URL.** Any Postgres works; Supabase free tier is easy. In
   Supabase use the **Transaction pooler** connection string (host ends in
   `...pooler.supabase.com`, port `6543`) — that's what the `max:1, prepare:false`
   pool is tuned for.
2. **Import the repo on Vercel** (New Project → pick this repo). Framework auto-
   detects as SvelteKit; leave build settings default.
3. **Set Environment Variables** (Project → Settings → Environment Variables):
   | Name           | Value                                              |
   | -------------- | -------------------------------------------------- |
   | `ADMIN_TOKEN`  | a long secret, e.g. `openssl rand -hex 24`         |
   | `STORE`        | `postgres`                                          |
   | `DATABASE_URL` | your pooler connection string (with the password)  |
4. **Deploy.** Open the URL, sign in with `ADMIN_TOKEN`, create a project.
5. **Verify the read API:**
   ```bash
   curl -H "x-api-key: <project key>" https://<your-app>.vercel.app/api/v1/flags
   ```

> Reusing an existing Supabase project (e.g. another app's)? Fine — FeatureGate's
> tables are prefixed `fg_` and won't collide.
