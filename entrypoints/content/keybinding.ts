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
      // 要素が表示されていない場合は操作の対象にしない
      if (element instanceof HTMLMediaElement && element.checkVisibility()) {
        mediaElements.push(element);
      }
    }

    for (const media of mediaElements) {
      switch (keybindingName) {
        case "faster": {
          const baseSpeed = media.playbackRate < 0.1 ? 0 : media.playbackRate;
          const speed = Math.min(baseSpeed + keybinding.value, 16); // max rate is 16
          media.playbackRate = speed;

          postMessage(`${speed.toFixed(2)}x`);

          break;
        }
        case "slower": {
          const speed = Math.max(media.playbackRate - keybinding.value, 0.07); // min rate is 0.0625
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
  };

  document.addEventListener("keydown", onKeyDown, { capture: true });
}

function postMessage(message: string) {
  // 最上位ウインドウにメッセージを送信
  globalThis.top?.postMessage({ type: "vico-show-overlay", message }, "*");
}
