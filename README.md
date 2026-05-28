# SD Family Law — Payload CMS

[Payload CMS](https://payloadcms.com) instance for San Diego Family Law Advocates.
This is the **content source** for the public Astro site at
[`sd-family-law-astro-template`](https://github.com/100401074/sd-family-law-astro-template).

**Architecture:**

```
[Payload CMS @ sdfla-cms.kallada.me]    ← Next.js 15 + Payload 3 + Postgres
       ↓ REST/GraphQL fetch at build time
[Astro static @ sdfamilylaw.kallada.me] ← stays static, fast, no runtime
       ↑ webhook triggers redeploy on Payload save
```

When an editor changes any content in Payload, the `afterChange` hook fires the
Astro rebuild webhook. The live site updates within ~30 seconds.

---

## Collections

| Collection | What it holds |
|---|---|
| **articles** | Every page on the site: cost articles, FAQs, comparisons, process guides, city pages, pillar guides, landing pages. Each maps 1:1 to `/articles/{slug}` on the Astro site. |
| **practice-areas** | Family law practice areas shown in the landing-page card grid + footer. |
| **credentials** | Bar / awards / press recognition shown in the credentials strip. |
| **media** | Uploaded images (hero, OG, featured, credential logos). Auto-resized at upload. |
| **users** | Admin / Editor / Attorney Reviewer roles. |

## Globals

| Global | What it holds |
|---|---|
| **firm-config** | Firm name, phone, hours, intake URL, address, areas served, navigation. |
| **attorney** | Default reviewing attorney (name, bar number, admission year, profile URL, bio). |

---

## Local development

### Prerequisites

- Node 20 or 22
- A running Postgres instance (`postgresql://...`)

### Setup

```sh
git clone https://github.com/100401074/sd-family-law-payload-cms.git
cd sd-family-law-payload-cms
cp .env.example .env
# Edit .env: set DATABASE_URI and PAYLOAD_SECRET
npm install
npm run dev
```

Visit `http://localhost:3000/admin` and create the first admin user.

### Generate TypeScript types from collections

```sh
npm run generate:types
```

Produces `src/payload-types.ts` — fully typed for the rest of your code.

---

## Deploy

### Docker

The included `Dockerfile` is a multi-stage build (node 22-alpine, Next.js standalone output) that exposes port 3000.

```sh
docker build -t sdfla-cms .
docker run -p 3000:3000 \
  -e DATABASE_URI=postgres://... \
  -e PAYLOAD_SECRET=... \
  -e ASTRO_REBUILD_WEBHOOK=... \
  sdfla-cms
```

### Coolify (current preview deploy)

Deployed at https://sdfla-cms.kallada.me with:
- Build pack: Dockerfile
- Postgres database: Coolify-managed Postgres 15 service
- Persistent volume for `/app/media` (uploaded images)
- Auto-redeploy on push to `main`

Required env vars (set in Coolify app settings):

| Var | Value |
|---|---|
| `DATABASE_URI` | Postgres connection string (use Coolify's internal hostname) |
| `PAYLOAD_SECRET` | 48-char random string (`openssl rand -base64 48`) |
| `PAYLOAD_PUBLIC_SERVER_URL` | `https://sdfla-cms.kallada.me` |
| `NEXT_PUBLIC_SERVER_URL` | `https://sdfla-cms.kallada.me` |
| `ASTRO_REBUILD_WEBHOOK` | Coolify deploy webhook URL for the Astro app |
| `CORS_ORIGINS` | `https://sdfamilylaw.kallada.me,http://localhost:4321` |
| `CSRF_ORIGINS` | `https://sdfla-cms.kallada.me` |

---

## API

Payload exposes REST + GraphQL out of the box. The Astro site uses the REST endpoints at build time.

### REST examples

```
GET  https://sdfla-cms.kallada.me/api/articles?where[status][equals]=published&limit=100
GET  https://sdfla-cms.kallada.me/api/articles/{id}
GET  https://sdfla-cms.kallada.me/api/practice-areas?sort=order
GET  https://sdfla-cms.kallada.me/api/globals/firm-config
GET  https://sdfla-cms.kallada.me/api/globals/attorney
```

Auth is optional for read access (configured in each collection's `access.read`).
For higher security in production, generate an API key for the Astro builder and pass it as `Authorization: users API-Key <key>`.

### GraphQL

Playground at `/api/graphql-playground` (development only). The schema mirrors the collections.

---

## Editorial workflow

1. **Editor** drafts an article in Payload (Lexical rich-text editor).
2. **Attorney Reviewer** approves: changes `status` from `draft` → `published`.
3. `afterChange` hook fires; Astro rebuild is triggered via Coolify webhook.
4. Live site updates within ~30 seconds.

---

## Customization

### Adding a new collection

1. Create `src/collections/Whatever.ts` exporting a `CollectionConfig`.
2. Import + add to the `collections` array in `src/payload.config.ts`.
3. Add the `triggerAstroRebuild` hook if changes should rebuild the Astro site.
4. Restart `npm run dev`; Payload generates the admin UI and APIs automatically.

### Migrating to a different database

Payload supports MongoDB out of the box. Replace `@payloadcms/db-postgres` with `@payloadcms/db-mongodb` and update the adapter in `payload.config.ts`.

### Changing rich text editor

Currently using Lexical (Payload's modern default). To use Slate or markdown, swap the `editor` in `payload.config.ts`.

---

## Architectural notes

- **Decoupled.** Payload owns content; Astro owns presentation. Either can be replaced without disturbing the other.
- **Static delivery.** The Astro site stays 100% static — Payload only runs at build time, never at request time. Public users never hit the CMS.
- **Rebuild on change.** The `triggerAstroRebuild` hook debounces multi-save floods to 5s and fires once per debounced window.
- **Postgres for schema integrity.** Payload's Postgres adapter is the most reliable choice for typed schemas + relational queries; MongoDB also works if preferred.
- **Standalone Next.js output** for production Docker images — no node_modules copied, ~150 MB final image.

---

## License

MIT.
