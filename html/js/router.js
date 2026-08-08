// Hash router — the browser build's stand-in for the Next.js app directory.
//
// Hash routes (rather than history routes) mean the whole thing can be dropped
// on any static host, or opened from a subdirectory, with no rewrite rules.

const routes = [];
let outlet = null;
let active = null;

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

export function currentPath() {
  const hash = location.hash.replace(/^#/, "");
  return hash === "" ? "/" : hash;
}

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) {
    render();
    return;
  }
  if (replace) location.replace(target);
  else location.hash = target;
}

async function render() {
  const path = currentPath();
  const match = routes
    .map((route) => ({ route, m: route.regex.exec(path) }))
    .find(({ m }) => m !== null);

  active?.dispose?.();
  active = null;
  outlet.replaceChildren();

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
  window.addEventListener("hashchange", render);
  render();
}
