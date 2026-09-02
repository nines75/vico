import { defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "./overlay.css";
import { setupOverlay } from "./overlay";
import { setupKeybindings } from "./keybinding";
import { shouldEnable } from "./filter";

export default defineContentScript({
  allFrames: true,
  matches: ["http://*/*", "https://*/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const settings = await loadSettings();
    if (!settings.enabled) return;

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
