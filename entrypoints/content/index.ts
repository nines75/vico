import { browser, defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "../inject.css";
import type { KeyBindingName, Settings } from "@/types/settings.types";
import { objectEntries } from "ts-extras";
import type { PublicPath } from "wxt/browser";

let settings: Settings;
let timerId = 0;
let coolDownId = 0;
const mediaElements: HTMLMediaElement[] = [];

export default defineContentScript({
  allFrames: true,
  matches: ["http://*/*", "https://*/*", "file:///*"],
  async main() {
    // eslint-disable-next-line unicorn/no-top-level-assignment-in-function
    settings = await loadSettings();

    initHandler(document);
  },
});

// -------------------------------------------------------------------------------------------
// initializer
// -------------------------------------------------------------------------------------------

function initHandler(target: Document) {
  if (isBlacklisted()) {
    return;
  }

  window.addEventListener("load", () => {
    init(globalThis.document);
  });

  if (target.readyState === "complete") {
    init(target);
  } else {
    target.addEventListener("readystatechange", () => {
      if (target.readyState === "complete") {
        init(target);
      }
    });
  }
}

function init(target: Document) {
  if (!settings.enabled || target.body.classList.contains("vsc-initialized"))
    return;

  setupListener();

  target.body.classList.add("vsc-initialized");

  if (target !== globalThis.document) {
    const link = target.createElement("link");
    link.href = browser.runtime.getURL("/assets/inject.css" as PublicPath);
    link.type = "text/css";
    link.rel = "stylesheet";

    target.head.append(link);
  }

  const docs = [target];

  // if iframe
  if (globalThis.self !== window.top && window.top !== null) {
    // should use try-catch because throw error if cross-origin iframe
    try {
      docs.push(window.top.document);
    } catch {
      // empty
    }
  }

  for (const doc of docs) {
    doc.addEventListener(
      "keydown",
      (event) => {
        const element = event.target;
        if (!(element instanceof HTMLElement)) return;

        const keyCode = event.keyCode;

        // Ignore if following modifier is active.
        if (event.altKey || event.ctrlKey || event.metaKey) {
          return;
        }

        // Ignore keydown event if typing in an input box
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element.isContentEditable
        )
          return;

        // Ignore keydown event if typing in a page without vsc
        if (mediaElements.length === 0) return;

        const item = objectEntries(settings.keyBindings).find(
          ([, keyBinding]) => keyBinding.key === keyCode,
        );
        if (item !== undefined) {
          const [action, keyBinding] = item;

          runAction({ action, value: keyBinding.value });

          if (keyBinding.force) {
            // disable websites key bindings
            event.preventDefault();
            event.stopPropagation();
          }
        }
      },
      { capture: true },
    );
  }

  // recursively assign controller
  const assignController = (node: Node, parent: Node) => {
    if (node instanceof HTMLMediaElement) {
      node.vsc ??= new Controller(node, parent);

      return;
    }

    if (node instanceof HTMLElement) {
      for (const child of node.children) {
        assignController(child, child.parentNode ?? parent);
      }
    }
  };

  // recursively unassign controller
  const unassignController = (node: Node, parent: Node) => {
    // Only proceed with supposed removal if node is missing from DOM
    if (target.body.contains(node)) return;

    if (node instanceof HTMLMediaElement) {
      if (node.vsc !== undefined) {
        node.vsc.remove();
      }

      return;
    }

    if (node instanceof HTMLElement) {
      for (const child of node.children) {
        unassignController(child, child.parentNode ?? parent);
      }
    }
  };

  const observer = new MutationObserver((mutations) => {
    // Process the DOM nodes lazily
    requestIdleCallback(
      () => {
        for (const mutation of mutations) {
          if (mutation.type !== "childList") continue;

          for (const node of mutation.addedNodes) {
            assignController(node, node.parentNode ?? mutation.target);
          }
          for (const node of mutation.removedNodes) {
            unassignController(node, node.parentNode ?? mutation.target);
          }
        }
      },
      { timeout: 1000 },
    );
  });
  observer.observe(target, {
    childList: true,
    subtree: true,
  });

  for (const media of target.querySelectorAll("video,audio")) {
    if (media instanceof HTMLMediaElement) media.vsc ??= new Controller(media);
  }

  const iframes = target.querySelectorAll("iframe");
  for (const iframe of iframes) {
    // Ignore frames we don't have permission to access (different origin).
    const contentDocument = iframe.contentDocument;
    if (contentDocument === null) continue;

    initHandler(contentDocument);
  }
}

function setupListener() {
  document.addEventListener(
    "ratechange",
    (event) => {
      if (coolDownId > 0) {
        event.stopImmediatePropagation();
      }

      // It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
      // a video controller attached to it. If we do, ignore it.
      const video = event.target;
      if (!(video instanceof HTMLMediaElement) || video.vsc === undefined)
        return;

      const speed = Number(video.playbackRate.toFixed(2));
      video.vsc.root.textContent = speed.toFixed(2);

      // show the controller for 1000ms if it's hidden.
      runAction({ action: "blink" });
    },
    { capture: true },
  );
}

// -------------------------------------------------------------------------------------------

export class Controller {
  private media: HTMLMediaElement;
  public host: HTMLElement;
  public root: Element;
  public blinkTimeOut: number | undefined;

  constructor(media: HTMLMediaElement, parent?: Node) {
    this.media = media;
    mediaElements.push(media);

    const speed = this.media.playbackRate.toFixed(2);

    const wrapper = this.media.ownerDocument.createElement("div");
    wrapper.classList.add("vsc-controller");

    if (this.media.src === "" && this.media.currentSrc === "") {
      wrapper.classList.add("vsc-nosource");
    }

    if (settings.startHidden) {
      wrapper.classList.add("vsc-hidden");
    }

    const shadowRoot = wrapper.attachShadow({ mode: "open" });
    const fragment = new DocumentFragment();

    const style = document.createElement("style");
    style.textContent = `@import "${browser.runtime.getURL("/assets/shadow.css" as PublicPath)}";`;

    const div = document.createElement("div");
    div.id = "controller";
    div.style.opacity = settings.controllerOpacity.toString();
    div.textContent = speed;

    fragment.append(style, div);
    shadowRoot.append(fragment);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const root = shadowRoot.querySelector("#controller")!;
    this.root = root;

    if (root instanceof HTMLElement) {
      root.addEventListener(
        "mousedown",
        (event) => {
          runAction({ action: "drag", event });
          event.stopPropagation();
        },
        { capture: true },
      );
    }

    root.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      },
      { capture: false },
    );
    root.addEventListener(
      "mousedown",
      (e) => {
        e.stopPropagation();
      },
      { capture: false },
    );

    const insertTarget = this.media.parentElement ?? parent;
    insertTarget?.insertBefore(wrapper, insertTarget.firstChild);

    this.host = wrapper;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        if (!(target instanceof HTMLMediaElement)) continue;

        this.host.classList.toggle(
          "vsc-nosource",
          target.src === "" && target.currentSrc === "",
        );
      }
    });
    observer.observe(media, {
      attributes: true,
      attributeFilter: ["src", "currentSrc"],
    });
  }

  remove() {
    this.host.remove();

    delete this.media.vsc;

    const index = mediaElements.indexOf(this.media);
    if (index !== -1) {
      mediaElements.splice(index, 1);
    }
  }
}

function isBlacklisted() {
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

function setSpeed(video: HTMLMediaElement, speed: number) {
  const speedvalue = speed.toFixed(2);
  video.playbackRate = Number(speedvalue);

  if (coolDownId > 0) {
    clearTimeout(coolDownId);
  }

  coolDownId = setTimeout(() => {
    coolDownId = 0;
  }, 1000);
}

function runAction(
  params:
    | { action: KeyBindingName; value: number }
    | { action: "blink" }
    | { action: "drag"; event: MouseEvent },
) {
  for (const media of mediaElements) {
    const host = media.vsc?.host;
    if (host === undefined) continue;

    host.classList.add("vcs-show");

    if (timerId > 0) clearTimeout(timerId);

    timerId = setTimeout(() => {
      host.classList.remove("vcs-show");
      timerId = 0;
    }, 2000);

    if (media.classList.contains("vsc-cancelled")) continue;

    switch (params.action) {
      case "rewind": {
        media.currentTime -= params.value;

        break;
      }
      case "advance": {
        media.currentTime += params.value;

        break;
      }
      case "faster": {
        // min rate is 16
        const speed = Math.min(
          (media.playbackRate < 0.1 ? 0 : media.playbackRate) + params.value,
          16,
        );
        setSpeed(media, speed);

        break;
      }
      case "slower": {
        // min rate is 0.0625
        const speed = Math.max(media.playbackRate - params.value, 0.07);
        setSpeed(media, speed);

        break;
      }
      case "reset": {
        setSpeed(media, 1);

        break;
      }
      case "display": {
        host.classList.add("vsc-manual");
        host.classList.toggle("vsc-hidden");

        break;
      }
      case "blink": {
        if (media.vsc === undefined) break;

        // if vsc is hidden, show it briefly to give the use visual feedback that the action is excuted.
        if (
          host.classList.contains("vsc-hidden") ||
          media.vsc.blinkTimeOut !== undefined
        ) {
          clearTimeout(media.vsc.blinkTimeOut);
          host.classList.remove("vsc-hidden");

          media.vsc.blinkTimeOut = setTimeout(() => {
            host.classList.add("vsc-hidden");

            if (media.vsc !== undefined) media.vsc.blinkTimeOut = undefined;
          }, 1000);
        }

        break;
      }
      case "drag": {
        handleDrag(media, params.event);

        break;
      }
    }
  }
}

function handleDrag(media: HTMLMediaElement, event: MouseEvent) {
  const host = media.vsc?.host;
  if (host === undefined) return;

  const root = media.vsc?.root;
  if (!(root instanceof HTMLElement)) return;

  const directParent = host.parentElement;
  if (directParent === null) return;

  // Find nearest parent of same size as video parent.
  let parent = directParent;
  while (
    parent.parentElement !== null &&
    parent.parentElement.offsetHeight === parent.offsetHeight &&
    parent.parentElement.offsetWidth === parent.offsetWidth
  ) {
    parent = parent.parentElement;
  }

  media.classList.add("vcs-dragging");
  root.classList.add("dragging");

  const [left, top] = [parseInt(root.style.left), parseInt(root.style.top)];

  const startDragging = (target: MouseEvent) => {
    const dx = target.clientX - event.clientX;
    const dy = target.clientY - event.clientY;

    root.style.left = `${left + dx}px`;
    root.style.top = `${top + dy}px`;
  };

  const stopDragging = () => {
    parent.removeEventListener("mousemove", startDragging);
    parent.removeEventListener("mouseup", stopDragging);
    parent.removeEventListener("mouseleave", stopDragging);

    media.classList.remove("vcs-dragging");
    root.classList.remove("dragging");
  };

  parent.addEventListener("mousemove", startDragging);
  parent.addEventListener("mouseup", stopDragging);
  parent.addEventListener("mouseleave", stopDragging);
}
