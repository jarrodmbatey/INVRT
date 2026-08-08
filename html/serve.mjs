// Zero-dependency static server for the HTML build.
//
//   npm run html            → http://localhost:4173
//   node html/serve.mjs 8080
//
// Any static file server works (python3 -m http.server, npx serve, nginx,
// GitHub Pages); this one exists so the build has no prerequisites beyond Node.

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    // Contain everything under html/ — no traversal out of the build.
    const target = normalize(join(ROOT, pathname));
    if (!target.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const info = await stat(target).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-cache",
    });
    createReadStream(target).pipe(res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end(String(error));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`INVRT (static build) → http://${HOST}:${PORT}`);
});
