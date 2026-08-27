import { defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "./inject.css";
import type { KeyBindingName, Settings } from "@/types/settings.types";
import { objectEntries } from "ts-extras";

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
  log("Begin initializeWhenReady", 5);

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

  log("End initializeWhenReady", 5);
}

function init(target: Document) {
  log("Begin initializeNow", 5);

  if (!settings.enabled || target.body.classList.contains("vsc-initialized"))
    return;

  setupListener();

  target.body.classList.add("vsc-initialized");
  log("initializeNow: vsc-initialized added to document body", 5);

  if (target !== globalThis.document) {
    const link = target.createElement("link");
    link.href = browser.runtime.getURL("inject.css");
    link.type = "text/css";
    link.rel = "stylesheet";

    target.head.append(link);
  }

  const docs = [target];

  // if iframe
  if (globalThis.self !== window.top && window.top !== null)
    docs.push(window.top.document);

  for (const doc of docs) {
    doc.addEventListener(
      "keydown",
      (event) => {
        const element = event.target;
        if (!(element instanceof HTMLElement)) return;

        const keyCode = event.keyCode;
        log(`Processing keydown event: ${keyCode}`, 6);

        // Ignore if following modifier is active.
        if (event.altKey || event.ctrlKey || event.metaKey) {
          log(`Keydown event ignored due to active modifier: ${keyCode}`, 5);
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

  log("End initializeNow", 5);
}

function setupListener() {
  document.addEventListener(
    "ratechange",
    (event) => {
      if (coolDownId > 0) {
        log("Speed event propagation blocked", 4);
        event.stopImmediatePropagation();
      }

      // It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
      // a video controller attached to it. If we do, ignore it.
      const video = event.target;
      if (!(video instanceof HTMLMediaElement) || video.vsc === undefined)
        return;

      const speed = Number(video.playbackRate.toFixed(2));

      log(`Playback rate changed to ${speed}`, 4);

      log("Updating controller with new speed", 5);

      const speedIndicator = video.vsc.speedIndicator;
      if (speedIndicator !== undefined)
        speedIndicator.textContent = speed.toFixed(2);

      // show the controller for 1000ms if it's hidden.
      runAction({ action: "blink" });
    },
    { capture: true },
  );
}

// -------------------------------------------------------------------------------------------

/* Log levels (depends on caller specifying the correct level)
  1 - none
  2 - error
  3 - warning
  4 - info
  5 - debug
  6 - debug high verbosity + stack trace on each message
*/
function log(message: string, level: number) {
  if (settings.logLevel < level) return;

  switch (level) {
    case 2: {
      console.log("ERROR:" + message);
      break;
    }
    case 3: {
      console.log("WARNING:" + message);
      break;
    }
    case 4: {
      console.log("INFO:" + message);
      break;
    }
    case 5: {
      console.log("DEBUG:" + message);
      break;
    }
    case 6: {
      console.log("DEBUG (VERBOSE):" + message);
      console.trace();
      break;
    }
  }
}

function getKeyBindings(action: keyof Settings["keyBindings"]) {
  return settings.keyBindings[action].value;
}

function setKeyBindings(action: keyof Settings["keyBindings"], value: number) {
  settings.keyBindings[action].value = value;
}

export class Controller {
  private media: HTMLMediaElement;
  public gui: HTMLElement;
  public speedIndicator: HTMLElement | undefined = undefined;
  public blinkTimeOut: number | undefined;

  constructor(media: HTMLMediaElement, parent?: Node) {
    this.media = media;
    this.gui = this.createGui(parent);

    mediaElements.push(media);
  }

  remove() {
    this.gui.remove();

    delete this.media.vsc;

    const index = mediaElements.indexOf(this.media);
    if (index !== -1) {
      mediaElements.splice(index, 1);
    }
  }

  createGui(parent: Node | undefined) {
    log("initializeControls Begin", 5);

    const target = this.media.ownerDocument;
    const speed = this.media.playbackRate.toFixed(2);

    const top = `${Math.max(this.media.offsetTop, 0)}px`;
    const left = `${Math.max(this.media.offsetLeft, 0)}px`;

    log("Speed variable set to: " + speed, 5);

    const wrapper = target.createElement("div");
    wrapper.classList.add("vsc-controller");

    if (this.media.src === "" && this.media.currentSrc === "") {
      wrapper.classList.add("vsc-nosource");
    }

    if (settings.startHidden) {
      wrapper.classList.add("vsc-hidden");
    }

    const shadow = wrapper.attachShadow({ mode: "open" });
    const shadowTemplate = `
        <style>
          @import "${browser.runtime.getURL("shadow.css")}";
        </style>

        <div id="controller" style="top:${top}; left:${left}; opacity:${
          settings.controllerOpacity
        }">
          <span data-action="drag" class="draggable">${speed}</span>
          <span id="controls">
            <button data-action="rewind" class="rw">«</button>
            <button data-action="slower">&minus;</button>
            <button data-action="faster">&plus;</button>
            <button data-action="advance" class="rw">»</button>
            <button data-action="display" class="hideButton">&times;</button>
          </span>
        </div>
      `;

    shadow.innerHTML = shadowTemplate;

    const draggable = shadow.querySelector(".draggable");
    if (draggable instanceof HTMLElement) {
      draggable.addEventListener(
        "mousedown",
        (event) => {
          runAction({ action: "drag", event });
          event.stopPropagation();
        },
        { capture: true },
      );
    }

    shadow.querySelectorAll("button").forEach(function (button) {
      button.addEventListener(
        "click",
        (e) => {
          runAction({
            action: e.target?.dataset.action,
            value: getKeyBindings(e.target?.dataset.action),
            event: e,
          });
          e.stopPropagation();
        },
        { capture: true },
      );
    });

    shadow.querySelector("#controller")?.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      },
      { capture: false },
    );
    shadow.querySelector("#controller")?.addEventListener(
      "mousedown",
      (e) => {
        e.stopPropagation();
      },
      { capture: false },
    );

    this.speedIndicator = shadow.querySelector("span") as HTMLElement;

    const insertTarget = this.media.parentElement ?? parent;
    insertTarget?.insertBefore(wrapper, insertTarget.firstChild);

    return wrapper;
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
  log(`setSpeed started: ${speed}`, 5);

  const speedvalue = speed.toFixed(2);
  video.playbackRate = Number(speedvalue);

  const speedIndicator = video.vsc?.speedIndicator;
  if (speedIndicator !== undefined) speedIndicator.textContent = speedvalue;

  log("Begin refreshCoolDown", 5);

  if (coolDownId > 0) {
    clearTimeout(coolDownId);
  }

  coolDownId = setTimeout(() => {
    coolDownId = 0;
  }, 1000);

  log("End refreshCoolDown", 5);

  log(`setSpeed finished: ${speed}`, 5);
}

function runAction(
  params:
    | { action: KeyBindingName; value: number }
    | { action: "blink" }
    | { action: "drag"; event: MouseEvent },
) {
  log("runAction Begin", 5);

  // Get the controller that was used if called from a button press event e
  let targetController: Element | undefined;
  const target = params.event?.target;
  if (target instanceof HTMLElement) {
    const root = target.getRootNode();
    if (root instanceof ShadowRoot) {
      targetController = root.host;
    }
  }

  for (const media of mediaElements) {
    const gui = media.vsc?.gui;
    if (gui === undefined) continue;

    // Don't change video speed if the video has a different controller
    if (targetController !== undefined && targetController !== gui) continue;

    log("Showing controller", 4);
    gui.classList.add("vcs-show");

    if (timerId > 0) clearTimeout(timerId);

    timerId = setTimeout(() => {
      gui.classList.remove("vcs-show");
      timerId = 0;

      log("Hiding controller", 5);
    }, 2000);

    if (!media.classList.contains("vsc-cancelled")) {
      switch (params.action) {
        case "rewind": {
          log("Rewind", 5);
          media.currentTime -= params.value;

          break;
        }
        case "advance": {
          log("Fast forward", 5);
          media.currentTime += params.value;

          break;
        }
        case "faster": {
          log("Increase speed", 5);

          // min rate is 16
          const speed = Math.min(
            (media.playbackRate < 0.1 ? 0 : media.playbackRate) + params.value,
            16,
          );
          setSpeed(media, speed);

          break;
        }
        case "slower": {
          log("Decrease speed", 5);

          // min rate is 0.0625
          const speed = Math.max(media.playbackRate - params.value, 0.07);
          setSpeed(media, speed);

          break;
        }
        case "reset": {
          log("Reset speed", 5);
          resetSpeed(media, 1);

          break;
        }
        case "display": {
          log("Showing controller", 5);
          gui.classList.add("vsc-manual");
          gui.classList.toggle("vsc-hidden");

          break;
        }
        case "blink": {
          log("Showing controller momentarily", 5);

          if (media.vsc === undefined) break;

          // if vsc is hidden, show it briefly to give the use visual feedback that the action is excuted.
          if (
            gui.classList.contains("vsc-hidden") ||
            media.vsc.blinkTimeOut !== undefined
          ) {
            clearTimeout(media.vsc.blinkTimeOut);
            gui.classList.remove("vsc-hidden");

            media.vsc.blinkTimeOut = setTimeout(() => {
              gui.classList.add("vsc-hidden");

              if (media.vsc !== undefined) media.vsc.blinkTimeOut = undefined;
            }, 1000);
          }

          break;
        }
        case "drag": {
          handleDrag(media, params.event);

          break;
        }
        case "fast": {
          resetSpeed(media, params.value);

          break;
        }
      }
    }
  }
  log("runAction End", 5);
}

function resetSpeed(media: HTMLMediaElement, target) {
  if (media.playbackRate === target) {
    if (media.playbackRate === getKeyBindings("reset")) {
      if (target === 1) {
        log('Toggling playback speed to "fast" speed', 4);
        setSpeed(media, getKeyBindings("fast"));
      } else {
        log("Resetting playback speed to 1.0", 4);
        setSpeed(media, 1);
      }
    } else {
      log('Toggling playback speed to "reset" speed', 4);
      setSpeed(media, getKeyBindings("reset"));
    }
  } else {
    log('Toggling playback speed to "reset" speed', 4);
    setKeyBindings("reset", media.playbackRate);
    setSpeed(media, target);
  }
}

function handleDrag(media: HTMLMediaElement, event: MouseEvent) {
  const gui = media.vsc?.gui;
  if (gui === undefined) return;

  const shadowController = gui.shadowRoot?.querySelector("#controller");
  if (!(shadowController instanceof HTMLElement)) return;

  const directParent = gui.parentElement;
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
  shadowController.classList.add("dragging");

  const [left, top] = [
    parseInt(shadowController.style.left),
    parseInt(shadowController.style.top),
  ];

  const startDragging = (target: MouseEvent) => {
    const dx = target.clientX - event.clientX;
    const dy = target.clientY - event.clientY;

    shadowController.style.left = `${left + dx}px`;
    shadowController.style.top = `${top + dy}px`;
  };

  const stopDragging = () => {
    parent.removeEventListener("mousemove", startDragging);
    parent.removeEventListener("mouseup", stopDragging);
    parent.removeEventListener("mouseleave", stopDragging);

    media.classList.remove("vcs-dragging");
    shadowController.classList.remove("dragging");
  };

  parent.addEventListener("mousemove", startDragging);
  parent.addEventListener("mouseup", stopDragging);
  parent.addEventListener("mouseleave", stopDragging);
}
