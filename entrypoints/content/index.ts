import { createShadowRootUi, defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import type { KeyBindingName, Settings } from "@/types/settings.types";
import { objectEntries } from "ts-extras";
import debounce from "debounce";
import "./overlay.css";

export default defineContentScript({
  allFrames: true,
  matches: ["http://*/*", "https://*/*", "file:///*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const settings = await loadSettings();

    if (globalThis.self === window.top) {
      const elements = document.querySelectorAll("vico-overlay");
      for (const element of elements) {
        element.remove();
      }

      const ui = await createShadowRootUi(ctx, {
        name: "vico-overlay",
        position: "inline",
        anchor: "body",
        onMount(container) {
          const div = document.createElement("div");
          div.className = "overlay";

          container.append(div);
        },
      });
      ui.mount();

      window.addEventListener("message", (event) => {
        const data = event.data as { type: string; message: string };
        if (data.type === "vico-show-overlay") {
          showOverlay(data.message);
        }
      });
    }

    if (isBlacklisted(settings) || !settings.enabled) return;

    if (document.readyState === "complete") {
      init(settings);
      return;
    }

    document.addEventListener("readystatechange", () => {
      if (document.readyState === "complete") init(settings);
    });
  },
});

// -------------------------------------------------------------------------------------------
// initializer
// -------------------------------------------------------------------------------------------

function init(settings: Settings) {
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const element = event.target;
      if (
        !(element instanceof HTMLElement) ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element.isContentEditable
      )
        return;

      const item = objectEntries(settings.keyBindings).find(
        ([, keyBinding]) => keyBinding.key === event.key.toLowerCase(),
      );
      if (item === undefined) return;

      const [type, keyBinding] = item;

      runAction(type, keyBinding.value);
    },
    { capture: true },
  );
}

// -------------------------------------------------------------------------------------------

function isBlacklisted(settings: Settings) {
  for (const line of settings.blacklist.split("\n")) {
    if (line === "") continue;

    const results = /^\/(.*)\/([^/]*)$/.exec(line);

    const regexStr = results?.[1];
    const flags = results?.[2];

    let regex: RegExp | undefined;
    if (regexStr !== undefined && flags !== undefined) {
      if (!/^[isuvm]*$/.test(flags)) continue;

      try {
        regex = new RegExp(regexStr, flags);
      } catch {
        continue;
      }
    }

    if (regex === undefined) {
      if (line === location.hostname) return true;
    } else {
      if (regex.test(location.href)) return true;
    }
  }

  return false;
}

const showOverlay = (message: string) => {
  const host = document.querySelector("vico-overlay");
  const overlay = host?.shadowRoot?.querySelector(".overlay");

  if (overlay instanceof HTMLElement) {
    overlay.textContent = message;
    overlay.classList.add("visible");

    hideOverlay(overlay);
  }
};

const hideOverlay = debounce((host: HTMLElement) => {
  host.classList.remove("visible");
}, 2000);

function postMessage(message: string) {
  globalThis.top?.postMessage({ type: "vico-show-overlay", message }, "*");
}

function runAction(type: KeyBindingName, value: number) {
  const mediaElements: HTMLMediaElement[] = [];

  for (const element of document.querySelectorAll("video,audio")) {
    if (element instanceof HTMLMediaElement) {
      mediaElements.push(element);
    }
  }

  for (const media of mediaElements) {
    switch (type) {
      case "faster": {
        const baseSpeed = media.playbackRate < 0.1 ? 0 : media.playbackRate;
        const speed = Math.min(baseSpeed + value, 16); // max rate is 16
        media.playbackRate = speed;

        postMessage(`${speed.toFixed(2)}x`);

        break;
      }
      case "slower": {
        const speed = Math.max(media.playbackRate - value, 0.07); // min rate is 0.0625
        media.playbackRate = speed;

        postMessage(`${speed.toFixed(2)}x`);

        break;
      }
      case "reset": {
        media.playbackRate = 1;
        postMessage("1.00x");

        break;
      }
    }
  }
}
