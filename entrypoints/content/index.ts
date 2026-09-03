import { defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "./overlay.css";
import { setupOverlay } from "./overlay";
import { setupKeybindings } from "./keybinding";
import { shouldEnable } from "./filter";

export default defineContentScript({
  allFrames: true, // Run in all frames to support embedded videos
  cssInjectionMode: "ui", // Required to use createShadowRootUi()
  matches: ["http://*/*", "https://*/*"],
  async main(ctx) {
    const settings = await loadSettings();
    if (!settings.enabled) return;

    // Overlays inside iframes are hard to see, so set up the overlay only in
    // the top-level window and route all speed-change notifications there.
    // This must run regardless of the filter settings because this window may
    // show notifications from another window that is not filtered out.
    if (globalThis.self === globalThis.top) {
      setupOverlay(ctx);
    }

    if (!shouldEnable(settings)) return;

    if (document.readyState === "complete") {
      setupKeybindings(settings);

      return;
    }

    document.addEventListener("readystatechange", () => {
      if (document.readyState === "complete") setupKeybindings(settings);
    });
  },
});
