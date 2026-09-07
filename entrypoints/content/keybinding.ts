import type { Settings } from "@/types/settings.types";
import { objectEntries } from "ts-extras";
import { getMediaElements } from "./dom";

export function setupKeybindings(settings: Settings) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    )
      return;

    const item = objectEntries(settings.keybindings).find(
      ([, keybinding]) =>
        keybinding.key.toLowerCase() === event.key.toLowerCase(),
    );
    if (item === undefined) return;

    let message: string | undefined;
    const [keybindingName, keybinding] = item;

    for (const media of getMediaElements()) {
      switch (keybindingName) {
        case "faster": {
          const baseSpeed = media.playbackRate < 0.1 ? 0 : media.playbackRate;
          const speed = Math.min(baseSpeed + keybinding.value, 16); // max rate is 16
          media.playbackRate = speed;

          message = `${speed.toFixed(2)}x`;

          break;
        }
        case "slower": {
          const speed = Math.max(media.playbackRate - keybinding.value, 0.07); // min rate is 0.0625
          media.playbackRate = speed;

          message = `${speed.toFixed(2)}x`;

          break;
        }
        case "reset": {
          media.playbackRate = 1;
          message = "1.00x";

          break;
        }
      }
    }

    // Send the message to the top-level window
    globalThis.top?.postMessage({ type: "vico-show-overlay", message }, "*");
  };

  document.addEventListener("keydown", onKeyDown, { capture: true });
}
