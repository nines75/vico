import { defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "./overlay.css";
import { setupOverlay } from "./overlay";
import { setupKeybindings } from "./keybinding";
import { isBlacklisted } from "./blacklist";

export default defineContentScript({
  allFrames: true,
  matches: ["http://*/*", "https://*/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const settings = await loadSettings();

    if (globalThis.self === window.top) {
      await setupOverlay(ctx);
    }

    if (isBlacklisted(settings) || !settings.enabled) return;

    if (document.readyState === "complete") {
      setupKeybindings(settings);
      return;
    }

    document.addEventListener("readystatechange", () => {
      if (document.readyState === "complete") setupKeybindings(settings);
    });
  },
});
