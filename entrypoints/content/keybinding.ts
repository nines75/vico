import type { KeybindingName, Settings } from "@/types/settings.types";
import { objectEntries } from "ts-extras";

export function setupKeybindings(settings: Settings) {
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

      const item = objectEntries(settings.keybindings).find(
        ([, keybinding]) => keybinding.key === event.key.toLowerCase(),
      );
      if (item === undefined) return;

      const [type, keybinding] = item;

      runAction(type, keybinding.value);
    },
    { capture: true },
  );
}

function postMessage(message: string) {
  globalThis.top?.postMessage({ type: "vico-show-overlay", message }, "*");
}

function runAction(type: KeybindingName, value: number) {
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
