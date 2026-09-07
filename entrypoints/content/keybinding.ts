import type { Settings } from "@/types/settings.types";
import { objectEntries } from "ts-extras";

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

    const [keybindingName, keybinding] = item;
    const mediaElements: HTMLMediaElement[] = [];

    for (const element of document.querySelectorAll("video,audio")) {
      // Ignore elements that are not visible
      if (element instanceof HTMLMediaElement && element.checkVisibility()) {
        mediaElements.push(element);
      }
    }

    // Some websites (e.g. BBC, Reddit) put media inside shadow roots,
    // so we need to traverse them. However, since most websites don't need this,
    // only traverse when the active element has a shadow DOM to avoid overhead.
    // Although this requires focusing the target element,
    // it behaves the same as media elements in iframes.
    const activeElement = document.activeElement;
    if (activeElement !== null && activeElement.shadowRoot !== null) {
      mediaElements.push(...getShadowDomMedia(activeElement.shadowRoot));
    }

    for (const media of mediaElements) {
      switch (keybindingName) {
        case "faster": {
          const baseSpeed = media.playbackRate < 0.1 ? 0 : media.playbackRate;
          const speed = Math.min(baseSpeed + keybinding.value, 16); // max rate is 16
          media.playbackRate = speed;

          showOverlay(`${speed.toFixed(2)}x`);

          break;
        }
        case "slower": {
          const speed = Math.max(media.playbackRate - keybinding.value, 0.07); // min rate is 0.0625
          media.playbackRate = speed;

          showOverlay(`${speed.toFixed(2)}x`);

          break;
        }
        case "reset": {
          media.playbackRate = 1;
          showOverlay("1.00x");

          break;
        }
      }
    }
  };

  document.addEventListener("keydown", onKeyDown, { capture: true });
}

function getShadowDomMedia(shadowRoot: ShadowRoot): HTMLMediaElement[] {
  const mediaElements: HTMLMediaElement[] = [];

  const elements = shadowRoot.querySelectorAll("*");
  for (const element of elements) {
    if (element instanceof HTMLMediaElement) mediaElements.push(element);

    // Media elements may be inside nested shadow roots (e.g. BBC), so traverse recursively.
    if (element.shadowRoot !== null) {
      mediaElements.push(...getShadowDomMedia(element.shadowRoot));
    }
  }

  return mediaElements;
}

function showOverlay(message: string) {
  // Send the message to the top-level window
  globalThis.top?.postMessage({ type: "vico-show-overlay", message }, "*");
}
