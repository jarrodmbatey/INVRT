// Bundle the static build into ONE self-contained HTML file.
//
//   npm run html:single                     → html/dist/invrt.html
//   npm run html:single -- --fragment PATH   → also writes a <head>-less copy
//
// The --fragment copy is the same page without the doctype/html/head/body
// wrapper, for hosts that supply their own document shell.
//
// The result has no external requests at all: three.js, every module, the CSS
// and the favicon are inlined. That makes it openable straight from disk
// (double-click, no server) and droppable on any host that serves a single
// file — which the multi-file build cannot do, because browsers refuse to load
// ES modules over file://.
//
// esbuild is the only build dependency in this repo, and only for this file;
// html/ itself stays a plain, readable, buildless source tree.

import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(HERE, "dist", "invrt.html");

const bundle = await build({
  entryPoints: [join(HERE, "js", "app.js")],
  bundle: true,
  // A classic script, not a module: inline modules still obey module CSP rules
  // and cannot be inlined alongside an import map.
  format: "iife",
  minify: true,
  target: ["chrome111", "firefox121", "safari17"],
  legalComments: "inline", // keeps three.js's MIT notice in the output
  write: false,
  alias: { three: join(HERE, "vendor", "three", "three.module.min.js") },
});

const js = bundle.outputFiles[0].text;
const css = await readFile(join(HERE, "styles.css"), "utf8");
const favicon = await readFile(join(HERE, "favicon.svg"), "utf8");
const faviconUri = `data:image/svg+xml;base64,${Buffer.from(favicon).toString("base64")}`;

const body = `    <style>
${css}
    </style>

    <header class="site-header">
      <nav class="site-nav">
        <a class="brand" href="#/">INVRT</a>
        <div class="nav-links">
          <a class="nav-link" href="#/gallery">Gallery</a>
          <button class="nav-link" type="button" id="settings-toggle" aria-expanded="false">Settings</button>
        </div>
      </nav>
    </header>

    <div class="settings-panel" id="settings-panel" hidden></div>

    <main id="app" class="app"></main>

    <noscript>
      <div class="file-protocol-notice">
        <div class="notice-inner">
          <p class="notice-title">INVRT needs JavaScript.</p>
          <p class="notice-body">The sculpture is generated in your browser; there is no server to fall back to.</p>
        </div>
      </div>
    </noscript>

    <script>
${js}
    </script>
`;

const document = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>INVRT — Your signature, rendered</title>
    <meta name="description" content="What lives inside you, turned outward into form." />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#070708" />
    <link rel="icon" href="${faviconUri}" type="image/svg+xml" />
  </head>
  <body>
${body}  </body>
</html>
`;

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, document);
report(OUT, document);

const flag = process.argv.indexOf("--fragment");
if (flag !== -1 && process.argv[flag + 1]) {
  const path = process.argv[flag + 1];
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  report(path, body);
}

function report(path, content) {
  console.log(`${path} — ${(Buffer.byteLength(content) / 1048576).toFixed(2)} MB, no external requests`);
}
