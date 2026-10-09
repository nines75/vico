import type {
  Keybinding,
  KeybindingName,
  Settings,
} from "@/types/settings.types";
import { objectEntries } from "ts-extras";
import { getMediaElements } from "./dom";
import type { Message } from "./overlay";

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

    const keybindingItem = objectEntries(settings.keybindings).find(
      ([, keybinding]) =>
        keybinding.key.toLowerCase() === event.key.toLowerCase(),
    );
    if (keybindingItem === undefined) return;

    const mediaElements = getMediaElements();
    if (mediaElements.length === 0) return;

    const speed = createSpeed(mediaElements, keybindingItem);
    if (speed === undefined) return;

    for (const media of mediaElements) {
      media.playbackRate = speed;
    }

    // Send the message to the top-level window
    globalThis.top?.postMessage(
      {
        type: "vico-show-overlay",
        message: `${speed.toFixed(2)}x`,
      } satisfies Message,
      "*",
    );

    // Disable the website's default keybinding
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  document.addEventListener("keydown", onKeyDown, { capture: true });
}

function createSpeed(
  mediaElements: HTMLMediaElement[],
  [keybindingName, keybinding]: [KeybindingName, Keybinding],
): number | undefined {
  // On websites that dynamically add media elements later (e.g. YouTube),
  // playback speeds may vary across elements, so the speed of the first
  // detected element is used as the baseline and applied to all elements.
  // While this might lead to unexpected playback speeds for the user in
  // some cases, it ensures that the overlay display consistently reflects
  // the actual playback speed.
  const media = mediaElements[0];
  if (media === undefined) return;

  switch (keybindingName) {
    case "faster": {
      const baseSpeed = media.playbackRate < 0.1 ? 0 : media.playbackRate;
      const speed = Math.min(baseSpeed + keybinding.value, 16); // Max rate is 16

      return speed;
    }
    case "slower": {
      const speed = Math.max(media.playbackRate - keybinding.value, 0.07); // Min rate is 0.0625

      return speed;
    }
    case "reset": {
      return 1;
    }
  }
}
