// INVRT — static HTML build.
//
// Everything the Next.js app does on a server (translate, prompt, provider
// call, storage, title) happens here in the browser instead. The entry point
// wires the routes and the settings panel; the ritual itself lives in js/views.

import { define, navigate, onNavigate, start } from "./router.js";
import { landingView } from "./views/landing.js";
import { baselineView, stateView } from "./views/tree.js";
import { formingView } from "./views/forming.js";
import { resultView } from "./views/result.js";
import { galleryView } from "./views/gallery.js";
import { providerOptions } from "./render/providers.js";
import { clearGenerations, getSettings, isMemoryOnly, listGenerations, ritual, setSettings, storageEstimate } from "./store.js";
import { el } from "./components/dom.js";

define("/", landingView);
define("/baseline", (outlet) => {
  // Entering the flow from the top starts a fresh ritual.
  ritual.reset();
  return baselineView(outlet);
});
define("/state", stateView);
define("/forming", formingView);
define("/result/:id", resultView);
define("/gallery", galleryView);

start(document.getElementById("app"));
mountSettings();

/** A small panel for the two things a static build has to expose. */
function mountSettings() {
  const panel = document.getElementById("settings-panel");
  const toggle = document.getElementById("settings-toggle");

  async function paint() {
    const settings = getSettings();
    // Touch the gallery first so memory-only mode is known before it is reported.
    const pieces = await listGenerations();
    const estimate = await storageEstimate();
    const where = isMemoryOnly()
      ? `Held in memory only — this page cannot use browser storage, so the ${pieces.length === 1 ? "piece" : `${pieces.length} pieces`} here will go when the tab closes.`
      : `Stored in this browser (IndexedDB)${estimate?.usage != null ? ` · about ${(estimate.usage / 1048576).toFixed(1)} MB in use` : ""}.`;

    panel.replaceChildren(
      el("h2", "Renderer"),
      ...providerOptions().map(({ key, label }) =>
        el(
          "label",
          el("input", {
            type: "radio",
            name: "provider",
            value: key,
            checked: settings.provider === key,
            onChange: () => {
              setSettings({ provider: key });
              paint();
            },
          }),
          el("span", label),
        ),
      ),
      el(
        "p.settings-note",
        "This build renders in your browser. There is no server here to hold a Replicate key, so Flux Depth generation stays in the Next.js app — see html/README.md.",
      ),
      el("h2", { style: { marginTop: "1.25rem" } }, "Gallery"),
      el("p.settings-note", where),
      el(
        "button.button",
        {
          type: "button",
          onClick: async () => {
            if (!confirmed("Delete every piece in this gallery? This cannot be undone.")) return;
            await clearGenerations();
            await paint();
            navigate("/gallery");
          },
        },
        "Clear gallery",
      ),
    );
  }

  function close() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  /** Sandboxed frames may refuse confirm(); a blocked prompt must not delete. */
  function confirmed(message) {
    try {
      return window.confirm(message);
    } catch {
      return false;
    }
  }

  toggle.addEventListener("click", async () => {
    const opening = panel.hidden;
    if (opening) await paint();
    panel.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
  });

  // Click-away, Escape and any navigation close it.
  document.addEventListener("click", (event) => {
    if (panel.hidden) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close();
  });
  onNavigate(close);
}
