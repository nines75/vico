import { defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "./inject.css";
import type { Settings } from "@/types/settings.types";
import { objectEntries } from "ts-extras";

let settings: Settings;
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

  if (target === globalThis.document) {
    defineVideoController();
  } else {
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

          runAction(action, keyBinding.value);

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
      node.vsc = new Controller(node, parent);

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
    if (media instanceof HTMLMediaElement) media.vsc = new Controller(media);
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
      if (coolDown) {
        log("Speed event propagation blocked", 4);
        event.stopImmediatePropagation();
      }

      // It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
      // a video controller attached to it. If we do, ignore it.
      const video = event.target;
      if (!(video instanceof HTMLMediaElement) || video.vsc === undefined)
        return;

      const speedIndicator = video.vsc.speedIndicator;
      const src = video.currentSrc;
      const speed = Number(video.playbackRate.toFixed(2));

      log(`Playback rate changed to ${speed}`, 4);

      log("Updating controller with new speed", 5);
      speedIndicator.textContent = speed.toFixed(2);
      settings.speeds[src] = speed;

      log("Storing lastSpeed in settings for the rememberSpeed feature", 5);
      settings.lastSpeed = speed;

      log("Syncing chrome settings for lastSpeed", 5);
      browser.storage.local.set({ lastSpeed: speed }, () => {
        log("Speed setting saved: " + speed, 5);
      });

      // show the controller for 1000ms if it's hidden.
      runAction("blink", null, null);
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
function log(message, level) {
  const verbosity = settings.logLevel;
  if (level === undefined) {
    level = settings.defaultLogLevel;
  }
  if (verbosity >= level) {
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
}

function getKeyBindings(action: keyof Settings["keyBindings"]) {
  return settings.keyBindings[action].value;
}

function setKeyBindings(action: keyof Settings["keyBindings"], value: number) {
  settings.keyBindings[action].value = value;
}

// Data structures
// ---------------
// videoController (JS object) instances:
//   video = AUDIO/VIDEO DOM element
//   parent = A/V DOM element's parentElement OR
//            (A/V elements discovered from the Mutation Observer)
//            A/V element's parentNode OR the node whose children changed.
//   div = Controller's DOM element (which happens to be a DIV)
//   speedIndicator = DOM element in the Controller of the speed indicator

// added to AUDIO / VIDEO DOM elements
//    vsc = reference to the videoController
export class Controller {
  private video: HTMLMediaElement | null = null;
  private handlePlay: ((event: Event) => void) | undefined;
  private handleSeek: ((event: Event) => void) | undefined;
  public div: HTMLElement | undefined;
  public speedIndicator: HTMLElement | null = null;

  constructor(target: HTMLMediaElement, parent?: Node) {
    if (target.vsc !== undefined) {
      return target.vsc;
    }

    mediaElements.push(target);

    this.video = target;

    let storedSpeed = settings.speeds[target.currentSrc];

    if (settings.rememberSpeed) {
      log("Recalling stored speed due to rememberSpeed being enabled", 5);
      storedSpeed = settings.lastSpeed;
    } else {
      if (!storedSpeed) {
        log(
          "Overwriting stored speed to 1.0 due to rememberSpeed being disabled",
          5,
        );
        storedSpeed = 1;
      }
      setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed
    }

    log("Explicitly setting playbackRate to: " + storedSpeed, 5);
    target.playbackRate = storedSpeed;

    this.div = this.createGui(parent);

    const mediaEventAction = (event) => {
      storedSpeed = settings.speeds[event.target.currentSrc];

      if (settings.rememberSpeed) {
        log(
          "Storing lastSpeed into settings.speeds (rememberSpeed enabled)",
          5,
        );
        storedSpeed = settings.lastSpeed;
      } else {
        if (!storedSpeed) {
          log("Overwriting stored speed to 1.0 (rememberSpeed not enabled)", 4);
          storedSpeed = 1;
        }
        // resetSpeed isn't really a reset, it's a toggle
        log("Setting reset keybinding to fast", 5);
        setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed
      }
      // TODO: Check if explicitly setting the playback rate to 1.0 is
      // necessary when rememberSpeed is disabled (this may accidentally
      // override a website's intentional initial speed setting interfering
      // with the site's default behavior)
      log("Explicitly setting playbackRate to: " + storedSpeed, 4);
      setSpeed(event.target, storedSpeed);
    };

    target.addEventListener(
      "play",
      (this.handlePlay = mediaEventAction.bind(this)),
    );

    target.addEventListener(
      "seeked",
      (this.handleSeek = mediaEventAction.bind(this)),
    );

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "attributes") continue;

        log("mutation of A/V element", 5);
        this.div?.classList.toggle(
          "vsc-nosource",
          mutation.target.src === "" && mutation.target.currentSrc === "",
        );
      }
    });
    observer.observe(target, {
      attributeFilter: ["src", "currentSrc"],
    });
  }

  remove() {
    this.div?.remove();

    if (this.handlePlay !== undefined)
      this.video?.removeEventListener("play", this.handlePlay);
    if (this.handleSeek !== undefined)
      this.video?.removeEventListener("seek", this.handleSeek);

    delete this.video?.vsc;

    const index = mediaElements.indexOf(this.video);
    if (index !== -1) {
      mediaElements.splice(index, 1);
    }
  }

  createGui(parent: Node | undefined) {
    if (this.video === null) return;

    log("initializeControls Begin", 5);

    const target = this.video.ownerDocument;
    const speed = this.video.playbackRate.toFixed(2);

    const top = `${Math.max(this.video.offsetTop, 0)}px`;
    const left = `${Math.max(this.video.offsetLeft, 0)}px`;

    log("Speed variable set to: " + speed, 5);

    const wrapper = target.createElement("div");
    wrapper.classList.add("vsc-controller");

    if (this.video.src === "" && this.video.currentSrc === "") {
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
    shadow.querySelector(".draggable")?.addEventListener(
      "mousedown",
      (event) => {
        runAction(event.target?.dataset.action, false, event);
        event.stopPropagation();
      },
      { capture: true },
    );

    shadow.querySelectorAll("button").forEach(function (button) {
      button.addEventListener(
        "click",
        (e) => {
          runAction(
            e.target?.dataset.action,
            getKeyBindings(e.target?.dataset.action),
            e,
          );
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

    this.speedIndicator = shadow.querySelector("span");

    const insertTarget = this.video.parentElement ?? parent;
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

let coolDown = false;
function refreshCoolDown() {
  log("Begin refreshCoolDown", 5);
  if (coolDown) {
    clearTimeout(coolDown);
  }
  coolDown = setTimeout(function () {
    coolDown = false;
  }, 1000);
  log("End refreshCoolDown", 5);
}

function setSpeed(video: HTMLMediaElement, speed: number) {
  log(`setSpeed started: ${speed}`, 5);

  const speedvalue = speed.toFixed(2);
  video.playbackRate = Number(speedvalue);

  const speedIndicator = video.vsc?.speedIndicator;
  speedIndicator?.textContent = speedvalue;

  settings.lastSpeed = speed;

  refreshCoolDown();

  log(`setSpeed finished: ${speed}`, 5);
}

function runAction(action, value, e) {
  log("runAction Begin", 5);

  // Get the controller that was used if called from a button press event e
  if (e) {
    var targetController = e.target.getRootNode().host;
  }

  for (const media of mediaElements) {
    const gui = media.vsc?.div;
    if (gui === undefined) continue;

    // Don't change video speed if the video has a different controller
    if (e && targetController != gui) {
      continue;
    }

    showController(gui);

    if (!media.classList.contains("vsc-cancelled")) {
      switch (action) {
        case "rewind": {
          log("Rewind", 5);
          media.currentTime -= value;

          break;
        }
        case "advance": {
          log("Fast forward", 5);
          media.currentTime += value;

          break;
        }
        case "faster": {
          log("Increase speed", 5);
          // Maximum playback speed in Chrome is set to 16:
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=166
          var s = Math.min(
            (media.playbackRate < 0.1 ? 0 : media.playbackRate) + value,
            16,
          );
          setSpeed(media, s);

          break;
        }
        case "slower": {
          log("Decrease speed", 5);
          // Video min rate is 0.0625:
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=165
          var s = Math.max(media.playbackRate - value, 0.07);
          setSpeed(media, s);

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
          // if vsc is hidden, show it briefly to give the use visual feedback that the action is excuted.
          if (
            gui.classList.contains("vsc-hidden") ||
            gui.blinkTimeOut !== undefined
          ) {
            clearTimeout(gui.blinkTimeOut);
            gui.classList.remove("vsc-hidden");
            gui.blinkTimeOut = setTimeout(
              () => {
                gui.classList.add("vsc-hidden");
                gui.blinkTimeOut = undefined;
              },
              value ? value : 1000,
            );
          }

          break;
        }
        case "drag": {
          handleDrag(media, e);

          break;
        }
        case "fast": {
          resetSpeed(media, value);

          break;
        }
        case "pause": {
          if (media.paused) {
            log("Resuming video", 5);
            media.play();
          } else {
            log("Pausing video", 5);
            media.pause();
          }

          break;
        }
        case "muted": {
          media.muted = !media.muted;

          break;
        }
        case "mark": {
          log("Adding marker", 5);
          media.vsc.mark = media.currentTime;

          break;
        }
        case "jump": {
          log("Recalling marker", 5);
          if (media.vsc.mark && typeof media.vsc.mark === "number") {
            media.currentTime = media.vsc.mark;
          }

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

function handleDrag(media: HTMLMediaElement, e) {
  const controller = media.vsc?.div;
  if(controller === undefined) return;

  const shadowController = controller.shadowRoot.querySelector("#controller");

  // Find nearest parent of same size as video parent.
  let parentElement = controller.parentElement;
  while (
    parentElement.parentNode &&
    parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
    parentElement.parentNode.offsetWidth === parentElement.offsetWidth
  ) {
    parentElement = parentElement.parentNode;
  }

  media.classList.add("vcs-dragging");
  shadowController.classList.add("dragging");

  const initialMouseXY = [e.clientX, e.clientY];
  const initialControllerXY = [
    parseInt(shadowController.style.left),
    parseInt(shadowController.style.top),
  ];

  const startDragging = (e) => {
    const style = shadowController.style;
    const dx = e.clientX - initialMouseXY[0];
    const dy = e.clientY - initialMouseXY[1];
    style.left = initialControllerXY[0] + dx + "px";
    style.top = initialControllerXY[1] + dy + "px";
  };

  const stopDragging = () => {
    parentElement.removeEventListener("mousemove", startDragging);
    parentElement.removeEventListener("mouseup", stopDragging);
    parentElement.removeEventListener("mouseleave", stopDragging);

    shadowController.classList.remove("dragging");
    media.classList.remove("vcs-dragging");
  };

  parentElement.addEventListener("mouseup", stopDragging);
  parentElement.addEventListener("mouseleave", stopDragging);
  parentElement.addEventListener("mousemove", startDragging);
}

var timer = null;
function showController(controller) {
  log("Showing controller", 4);
  controller.classList.add("vcs-show");

  if (timer) clearTimeout(timer);

  timer = setTimeout(function () {
    controller.classList.remove("vcs-show");
    timer = false;
    log("Hiding controller", 5);
  }, 2000);
}
