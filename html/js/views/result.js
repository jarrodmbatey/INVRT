// Ported from app/result/[id]/page.tsx plus components/result/{ArtworkView,
// PathSummary,ResultActions}. The finished artwork — large and centered, with
// its title, interpretation, and quiet provenance.

import { clear, delay, el, formatDate } from "../components/dom.js";
import { navigate } from "../router.js";
import { getGeneration, ritual } from "../store.js";
import { regenerate } from "../render/providers.js";

export async function resultView(outlet, { id }) {
  const generation = await getGeneration(id);
  if (!generation) {
    outlet.appendChild(
      el(
        "div.page",
        el("h1.page-title", "Not found"),
        el(
          "div.empty",
          el("p", "That piece is not in this browser's gallery."),
          el("a.button", { href: "#/gallery" }, "Gallery"),
        ),
      ),
    );
    return null;
  }

  const urls = [];
  const objectUrl = (blob) => {
    const url = URL.createObjectURL(blob);
    urls.push(url);
    return url;
  };

  const page = el("div.page");
  outlet.appendChild(page);
  render(generation);

  function render(g) {
    clear(page);
    const src = objectUrl(g.image);
    const filename = `invrt-${g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;

    page.append(
      el("figure.artwork.fade-in-slow", el("img", { src, alt: g.title, draggable: "false" })),
      delay(el("h1.result-title.fade-up", g.title), 200),
      delay(
        el(
          "div.interpretation.fade-up",
          g.interpretation.split("\n").map((line) => el("p", line)),
        ),
        400,
      ),
      el(
        "div.path-summary.fade-up",
        el("p.label", g.baselineLabel),
        el("p.sub", `under · ${g.stateLabel}`),
        el("p.date", formatDate(g.createdAt)),
      ),
      actions(g, src, filename),
      provenance(g),
    );
  }

  function actions(g, src, filename) {
    const status = el("p.error-text");
    const row = el("div.actions-row");

    const regenButton = el("button.button", { type: "button" }, "Regenerate");
    regenButton.addEventListener("click", async () => {
      row.querySelectorAll("button").forEach((b) => (b.disabled = true));
      regenButton.textContent = "Forming…";
      status.textContent = "";
      try {
        const updated = await regenerate(g);
        render(updated);
      } catch (e) {
        console.error("[invrt] regeneration failed:", e);
        status.textContent = e instanceof Error ? e.message : "Regeneration failed";
        row.querySelectorAll("button").forEach((b) => (b.disabled = false));
        regenButton.textContent = "Regenerate";
      }
    });

    const newStateButton = el("button.button", { type: "button" }, "New state, same form");
    newStateButton.addEventListener("click", () => {
      ritual.continueFromBaseline(g.baselinePathIds, g.baselineSignature);
      navigate("/state");
    });

    row.append(regenButton, newStateButton, el("a.button", { href: src, download: filename }, "Download"));
    return el("div.actions.fade-up", row, status);
  }

  function provenance(g) {
    return el(
      "details.provenance.fade-in",
      el("summary", "Provenance"),
      el(
        "div.provenance-body",
        el(
          "p",
          el("span.key", "seed "),
          `${g.seed} · `,
          el("span.key", "provider "),
          `${g.provider} · `,
          el("span.key", "model "),
          g.model,
        ),
        el("p", el("span.key", "signature "), g.baselineSignature),
        el("p", el("span.key", "prompt "), g.prompt),
        el("p", el("span.key", "negative "), g.negativePrompt),
        g.controlImage
          ? el(
              "figure.provenance-figure",
              el("img", { src: objectUrl(g.controlImage), alt: "Depth control map" }),
              el("figcaption", "depth control map — baseline only"),
            )
          : null,
      ),
    );
  }

  return {
    dispose() {
      urls.forEach(URL.revokeObjectURL);
    },
  };
}
