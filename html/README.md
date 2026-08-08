# INVRT — static HTML build

The whole ritual (landing → baseline → state → forming → result → gallery) as
plain HTML, CSS and ES modules. No Next.js, no React, no build step, no
database, no server route — everything the Next.js app does on a server happens
in the browser instead.

## Run it

**Just open it:** `html/dist/invrt.html` is the whole app as one file — every
module, three.js, the CSS and the icon inlined, no external requests at all.
Double-click it, mail it, drop it anywhere that serves a single file.

**From source:**

```bash
npm run html          # → http://localhost:4173
```

`html/serve.mjs` is a zero-dependency static file server; any other static host
works just as well:

```bash
python3 -m http.server -d html 4173
npx serve html
```

Then drop the directory on GitHub Pages, Netlify, S3 — it is all static files
and hash routes, so no rewrite rules are needed.

> The multi-file build has to be **served**, not opened from `file://`, because
> browsers refuse to load ES modules over `file://`. The page detects that and
> says so rather than failing silently. The single-file build has no such limit,
> which is the whole reason it exists.

**Rebuild the single file** after changing anything under `html/js` or
`styles.css`:

```bash
npm run html:single                          # → html/dist/invrt.html
npm run html:single -- --fragment out.html   # same page, no <head>/<body> wrapper
```

esbuild is the one build dependency in the repo and exists only for this; `html/`
itself stays a plain, readable, buildless source tree.

## What is the same as the Next.js app

The parts that decide what your piece *is* are ports, not rewrites — same
algorithms, same constants, same numbers:

| Browser build | Ported from |
| --- | --- |
| `js/hash.js` | `lib/hash.ts` |
| `js/translation/*.js` | `lib/translation/*.ts` |
| `js/prompt/*.js` | `lib/prompt/*.ts` |
| `js/interpret/title.js` | `lib/interpret/title.ts` |
| `js/sphere/seededNoise.js`, `buildSculpture.js`, `gestureCurve.js` | `components/sphere/*` |
| `js/sphere/controlRenderer.js` | `components/sphere/ControlRenderer.tsx` |
| `js/sphere/preview.js` | `components/sphere/InvrtSphere.tsx` (react-three-fiber → plain three.js) |
| `js/components/wordTree.js` | `components/tree/WordTree.tsx` + `WordChoice.tsx` |
| `js/render/providers.js` | `app/api/generate/route.ts` |
| `js/store.js` | `lib/store/useInvrtStore.ts` + Prisma + `lib/storage.ts` |
| `styles.css` | `app/globals.css` + the Tailwind classes across `app/` and `components/` |

Run the acceptance checks against these modules with:

```bash
npm run check:html
```

It is `scripts/check-invariants.ts` re-pointed at the browser build, plus two
extra checks that compare the ported trees against `lib/translation/*.ts` — so
if the two copies of the curation data ever drift, this fails.

## What is different, and why

**There is no image model.** Provider keys are the one thing a static page can
never hold: anything shipped to the browser is public. So the browser build has
no Replicate call and no key field. Real Flux Depth generation stays in the
Next.js app, where the token lives in a server route.

Instead it ships two local providers, switchable under **Settings → Renderer**:

- **Studio render** (default) — a lit 1024² photograph of the same deterministic
  sculpture, composited with bloom, grade, vignette and seeded film grain.
  `js/render/localRender.js`.
- **Depth control map** — the depth map returned as the artwork, exactly what
  `lib/providers/mock.ts` does when no `REPLICATE_API_TOKEN` is set.

The studio render keeps INVRT's lane discipline in pixels, not just in words:

```
js/render/materials.js   baseline → geometry, material, framing
js/render/lighting.js    state    → light, palette, atmosphere, grade
```

`js/render/lighting.js` is the visual twin of `lib/translation/stateTree.ts`
and `js/render/materials.js` of `lib/translation/baselineTree.ts` — each entry
is annotated with the descriptor it renders, so they can be edited together.

**Storage is the browser.** Finished pieces (metadata + the PNG blobs) live in
IndexedDB; in-progress selections live in `sessionStorage`. The gallery is
per-browser and per-device, and **Settings → Clear gallery** empties it. Both
layers are optional: where a sandboxed frame or private mode refuses them, the
ritual carries on in memory and the settings panel says the gallery will only
last for the tab.

**Routes are hashes.** `#/`, `#/baseline`, `#/state`, `#/forming`,
`#/result/<id>`, `#/gallery` — see `js/router.js`. The route is held in memory
and the URL is updated to match, rather than the other way round: in an
opaque-origin frame, writing the URL either throws or reloads the document out
from under the app. Where the URL can be written, links are real, shareable and
work with back/forward; where it cannot, navigation carries on in memory.

**Framing is solved, not fixed.** The R3F canvases pin the camera at `z = 3.4`,
which crops the form on wide or short viewports. Here the camera distance is
solved from each sculpture's own extent, so nothing is clipped at any window
shape. The depth/control map still renders at the original fixed camera, so it
stays byte-comparable with the Next.js app.

**Forming has a floor.** A local render takes about a second where Replicate
takes 30–60s, so the forming screen holds for ~4s to let the emergence finish.

**Regenerate replaces.** A local render of the same paths is deterministic down
to the grain, so re-running would only produce identical twins. Regenerate
re-renders the piece in place — useful after switching renderer, or after a
render that failed part-way.

**No webfonts.** Fraunces and Inter are not fetched; the display face falls back
through Fraunces → Iowan Old Style → Georgia, so the build works fully offline.

## Layout

```
html/
  index.html            shell, import map, file:// notice
  styles.css            design tokens + every component style
  serve.mjs             zero-dependency static server
  build-single.mjs      npm run html:single
  check-invariants.mjs  npm run check:html
  favicon.svg
  dist/invrt.html       generated: the whole app in one openable file
  js/
    app.js              entry: routes + settings panel
    router.js           hash router
    store.js            IndexedDB gallery, sessionStorage ritual, settings
    hash.js
    components/         dom helpers, word tree
    translation/        the trees, routing, gesture, translate
    prompt/             style spine, prompt assembly
    interpret/          title + interpretation
    sphere/             seeded noise, sculpture, gesture tube, depth export, preview
    render/             materials, lighting, environment, local render, providers
    views/              landing, tree, forming, result, gallery
  vendor/three/         three.js r184, MIT (three.module.min.js + three.core.min.js)
```

## Browser support

Needs WebGL2, ES modules, import maps, IndexedDB and `canvas.filter` — current
Chrome, Edge, Firefox and Safari 17+. Without WebGL the landing and forming
sculptures are skipped with a console warning rather than breaking the page;
generation itself does require WebGL.
