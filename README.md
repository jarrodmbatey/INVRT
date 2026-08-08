# INVRT

**Your signature, rendered.** What lives inside you, turned outward into form.

INVRT is an art engine for the inner human experience. It turns two things —
who you are (the **baseline**) and how you are right now (the **current
state**) — into a single abstract, gallery-grade artwork.

The organizing metaphor:

- **Baseline = the sculpture.** Stable identity → form, material, surface, geometry.
- **Current state = the weather and light** falling on that sculpture.

The same person always gets the same underlying form; only the light and
weather change with their present state. This is enforced, not aspirational —
see *Form-stability invariant* below.

## Setup

```bash
npm install
cp .env.example .env        # then add your Replicate token (optional, see below)
npx prisma db push          # creates prisma/dev.db (SQLite)
npm run dev                 # http://localhost:3000
```

That's it. With no API key, INVRT falls back to a **mock provider** that uses
the depth/control render as the artwork, so the entire loop (landing →
baseline → state → forming → result → gallery) works offline.

### Getting a Replicate token (real artwork)

1. Create an account at [replicate.com](https://replicate.com).
2. Create a token at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).
3. Put it in `.env` as `REPLICATE_API_TOKEN="r8_..."`.

INVRT targets `black-forest-labs/flux-depth-dev` (a depth-conditioned Flux
model). The slug is overridable with `REPLICATE_MODEL` in `.env` — if the
model moves or renames its inputs, check its page on Replicate and adjust
`lib/providers/replicate.ts` (the input mapping is one small object). Note:
Flux models take no `negative_prompt` input; the INVRT style spine carries the
exclusions in-prompt and the negative prompt is stored for provenance.

A `fal.ai` provider stub exists at `lib/providers/fal.ts` (`IMAGE_PROVIDER=fal`),
to be wired later.

### Static HTML build

There is also a **dependency-free HTML version** of the whole app in `html/` —
plain HTML, CSS and ES modules, no Next.js, no server, no database. Open
`html/dist/invrt.html` directly (the entire app as one self-contained file), or
run it from source:

```bash
npm run html          # → http://localhost:4173
npm run html:single   # rebuild html/dist/invrt.html
npm run check:html    # same invariant checks, run against the browser modules
```

The translation, prompt, title and sculpture layers are ports of the same code,
so a given baseline yields the same signature, seed and form in both. Since a
static page can never hold a provider key, it renders the artwork locally
(three.js, form from the baseline, light from the state) instead of calling
Replicate. See [`html/README.md`](html/README.md) for the full list of what is
shared and what differs.

## How it works

```
word taps ──► lib/translation/      paths → committed Descriptors + gesture
              lib/prompt/           Descriptors → prompt + locked style spine + seed
              components/sphere/    baseline → deterministic mesh → 1024² depth map
              app/api/generate      server: provider call, storage, title, interpretation
```

**Commit, don't average.** The first baseline choice locks the form/material
lane; the first state choice locks the light/mood lane. Deeper choices only
modulate. When the two are in tension (a radiant form under heavy weather),
the tension is expressed as a clause — "a luminous form, dimmed and cooled" —
never blended away.

### Form-stability invariant

- `seed = hash(baseline path)` — constant per baseline.
- The depth/control map is a function of the baseline only; current state
  never touches geometry.
- Current state changes only light/palette/mood/atmosphere tokens in the prompt.

Verify any time with:

```bash
npm run check
```

## Editing the trees and vocabulary (curation mode)

All creative data lives in plain TypeScript files — no database edits, no
admin UI:

| File | What it is |
| --- | --- |
| `lib/translation/baselineTree.ts` | The identity → sculpture tree (4 archetypes + modulators) |
| `lib/translation/stateTree.ts` | The feeling → weather tree (Lighter/Heavier) |
| `lib/translation/vocabulary.ts` | Controlled vocabulary banks |
| `lib/translation/routing.ts` | Commit-don't-average logic + the tension phrase table |
| `lib/interpret/title.ts` | Title + interpretation fragment templates |
| `lib/prompt/styleSpine.ts` | The locked INVRT style spine + negative prompt |

Edit wording freely; run `npm run check` afterward to confirm the invariants
still hold. Note that editing a baseline path's node **ids** changes its
signature (and therefore its form) — labels and descriptors are safe to edit.

## Deploying to Vercel

Vercel's serverless filesystem is ephemeral, so production swaps SQLite →
Postgres and local files → Vercel Blob. The code paths switch automatically;
you just connect the integrations:

1. Push this repo to GitHub and **import it in Vercel** (vercel.com/new).
2. In the project's **Storage** tab, add:
   - a **Postgres** database (Neon) — this sets `DATABASE_URL`;
   - a **Blob** store — this sets `BLOB_READ_WRITE_TOKEN`.
3. In **Settings → Environment Variables**, add `REPLICATE_API_TOKEN`
   (without it, the deploy runs on the mock provider).
4. Deploy. `vercel.json` makes the build use `prisma/schema.postgres.prisma`
   and run `prisma db push` against the production database automatically.

Open the deployment URL on your phone — the whole ritual is tap-first.

Notes:
- The two Prisma schema files have identical models; if you change models,
  change both (`schema.prisma` for local SQLite, `schema.postgres.prisma`
  for deploys).
- Generation can take 30–60s on Flux Depth; the route declares
  `maxDuration = 300`, which Vercel's fluid compute allows on all plans.
- For local dev nothing changes: SQLite + `public/renders/`, no Vercel
  account needed.

## Env vars

See `.env.example`. Keys are read only in server route handlers
(`app/api/.../route.ts`) and never reach the client.

## Scripts

- `npm run dev` — local dev
- `npm run build` / `npm start` — production
- `npm run check` — translation-layer invariant checks
- `npm run html` — serve the static HTML build from `html/`
- `npm run html:single` — bundle it into one openable file, `html/dist/invrt.html`
- `npm run check:html` — the same invariant checks against the HTML build
- `npx prisma studio` — inspect saved generations

## Not in MVP (deliberately)

Auth/accounts, payments, sharing, animation/video, personality scoring of any
kind, provider abstraction beyond Replicate + the fal stub. The seam for
image-to-video and a self-drawing gesture animation is the stored control map
+ gesture control points on each `Generation`.
