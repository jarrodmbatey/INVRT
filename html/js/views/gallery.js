// Ported from app/gallery/page.tsx — saved pieces as a calm grid.
// A room you walk back into. Here the room is IndexedDB, not Postgres.

import { delay, el, formatDate } from "../components/dom.js";
import { listGenerations } from "../store.js";

export async function galleryView(outlet) {
  const generations = await listGenerations();
  const urls = [];

  const page = el("div.page.page-wide", el("h1.page-title.fade-up", "Gallery"));
  outlet.appendChild(page);

  if (generations.length === 0) {
    page.appendChild(
      el(
        "div.empty.fade-in",
        el("p", "Nothing rendered yet."),
        el("a.button", { href: "#/baseline" }, "Begin"),
      ),
    );
    return null;
  }

  page.appendChild(
    el(
      "div.gallery-grid",
      generations.map((g, i) => {
        const url = URL.createObjectURL(g.image);
        urls.push(url);
        return delay(
          el(
            "div.gallery-item.fade-up",
            el(
              "a.thumb",
              { href: `#/result/${g.id}` },
              el("img", { src: url, alt: g.title, loading: "lazy" }),
              el("p.piece-title", g.title),
            ),
            el("p.meta", g.baselineLabel),
            el(
              "p.meta.meta-faint",
              `under · ${g.stateLabel} · ${formatDate(g.createdAt, { month: "short", day: "numeric", year: "numeric" })}`,
            ),
            el(
              "details",
              el("summary", "detail"),
              el("p", `seed ${g.seed} · ${g.provider} · ${g.model}`, el("br"), g.prompt),
            ),
          ),
          i * 90,
        );
      }),
    ),
  );

  return {
    dispose() {
      urls.forEach(URL.revokeObjectURL);
    },
  };
}
