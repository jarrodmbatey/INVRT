// Hash router — the browser build's stand-in for the Next.js app directory.
//
// Hash routes (rather than history routes) mean the whole thing can be dropped
// on any static host, or opened from a subdirectory or from a file, with no
// rewrite rules.
//
// The route is held in memory and the URL is updated to match, rather than the
// other way round. That ordering matters: in an opaque-origin frame — a
// sandboxed iframe, a srcdoc embed — writing the URL either throws or reloads
// the document out from under the app. Where the URL can be written, links are
// real and shareable; where it cannot, navigation simply carries on in memory.

const routes = [];
let outlet = null;
let active = null;
let route = null;
let urlWritable = true;
const listeners = new Set();

/** define("/result/:id", view) — one path segment per :param. */
export function define(pattern, view) {
  const names = [];
  const source = pattern
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) return segment;
      names.push(segment.slice(1));
      return "([^/]+)";
    })
    .join("/");
  routes.push({ regex: new RegExp(`^${source}$`), names, view });
}

function readLocation() {
  const hash = location.hash.replace(/^#/, "");
  return hash === "" ? "/" : hash;
}

export function currentPath() {
  return route ?? readLocation();
}

/** Called after every navigation — used to dismiss transient UI. */
export function onNavigate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function navigate(path, { replace = false } = {}) {
  route = path;
  if (urlWritable) {
    try {
      // pushState, never `location.hash =` — assigning the hash in a srcdoc
      // frame navigates the frame and throws the app away.
      const url = `#${path}`;
      if (replace) history.replaceState(null, "", url);
      else history.pushState(null, "", url);
    } catch {
      urlWritable = false;
    }
  }
  render();
}

async function render() {
  const path = currentPath();
  const match = routes
    .map((candidate) => ({ route: candidate, m: candidate.regex.exec(path) }))
    .find(({ m }) => m !== null);

  active?.dispose?.();
  active = null;
  outlet.replaceChildren();
  for (const fn of listeners) fn(path);

  if (!match) {
    navigate("/", { replace: true });
    return;
  }

  const params = Object.fromEntries(match.route.names.map((name, i) => [name, decodeURIComponent(match.m[i + 1])]));
  active = (await match.route.view(outlet, params)) ?? null;
  // Every route is a full screen; start each one at the top.
  window.scrollTo(0, 0);
}

export function start(mountPoint) {
  outlet = mountPoint;

  // Internal links are routed here rather than by the browser, so a blocked or
  // destructive fragment navigation can never reach the document. Modified
  // clicks fall through, so cmd/ctrl-click still opens a real URL in a new tab.
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href^="#/"]');
    if (!link) return;
    event.preventDefault();
    navigate(link.getAttribute("href").slice(1));
  });

  // Back/forward, and anything else that moves the URL.
  const fromUrl = () => {
    if (!urlWritable) return;
    const path = readLocation();
    if (path === route) return;
    route = path;
    render();
  };
  window.addEventListener("popstate", fromUrl);
  window.addEventListener("hashchange", fromUrl);

  render();
}
