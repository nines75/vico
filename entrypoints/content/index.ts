import { defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "./inject.css";
import type { Settings } from "@/types/settings.types";

let settings: Settings;

export default defineContentScript({
  allFrames: true,
  matches: ["http://*/*", "https://*/*", "file:///*"],
  async main() {
    // eslint-disable-next-line unicorn/no-top-level-assignment-in-function
    settings = await loadSettings();

    initHandler(document);
  },
});

const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

const tc = {
  // Holds a reference to all of the AUDIO/VIDEO DOM elements we've attached to
  mediaElements: [],
};

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
        const keyCode = event.keyCode;
        log("Processing keydown event: " + keyCode, 6);

        // Ignore if following modifier is active.
        if (event.altKey || event.ctrlKey || event.metaKey) {
          log("Keydown event ignored due to active modifier: " + keyCode, 5);
          return;
        }

        // Ignore keydown event if typing in an input box
        if (
          event.target.nodeName === "INPUT" ||
          event.target.nodeName === "TEXTAREA" ||
          event.target.isContentEditable
        ) {
          return false;
        }

        // Ignore keydown event if typing in a page without vsc
        if (tc.mediaElements.length === 0) {
          return false;
        }

        const item = settings.keyBindings.find((item) => item.key === keyCode);
        if (item) {
          runAction(item.action, item.value);
          if (item.force === "true") {
            // disable websites key bindings
            event.preventDefault();
            event.stopPropagation();
          }
        }

        return false;
      },
      { capture: true },
    );
  }

  function checkForVideo(node, parent, added) {
    // Only proceed with supposed removal if node is missing from DOM
    if (!added && target.body.contains(node)) {
      return;
    }
    if (
      node.nodeName === "VIDEO" ||
      (node.nodeName === "AUDIO" && settings.audioBoolean)
    ) {
      if (added) {
        node.vsc = new tc.videoController(node, parent);
      } else {
        if (node.vsc) {
          node.vsc.remove();
        }
      }
    } else if (node.children != undefined) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        checkForVideo(child, child.parentNode || parent, added);
      }
    }
  }

  const observer = new MutationObserver(function (mutations) {
    // Process the DOM nodes lazily
    requestIdleCallback(
      (_) => {
        for (const mutation of mutations) {
          switch (mutation.type) {
            case "childList": {
              mutation.addedNodes.forEach(function (node) {
                if (typeof node === "function") return;
                checkForVideo(node, node.parentNode || mutation.target, true);
              });
              mutation.removedNodes.forEach(function (node) {
                if (typeof node === "function") return;
                checkForVideo(node, node.parentNode || mutation.target, false);
              });
              break;
            }
            case "attributes": {
              if (
                mutation.target.attributes["aria-hidden"] &&
                mutation.target.attributes["aria-hidden"].value == "false"
              ) {
                const flattenedNodes = getShadow(target.body);
                const node = flattenedNodes.find((x) => x.tagName == "VIDEO");
                if (node) {
                  if (node.vsc) node.vsc.remove();
                  checkForVideo(node, node.parentNode || mutation.target, true);
                }
              }
              break;
            }
          }
        }
      },
      { timeout: 1000 },
    );
  });
  observer.observe(target, {
    attributeFilter: ["aria-hidden"],
    childList: true,
    subtree: true,
  });

  if (settings.audioBoolean) {
    var mediaTags = target.querySelectorAll("video,audio");
  } else {
    var mediaTags = target.querySelectorAll("video");
  }

  mediaTags.forEach(function (video) {
    video.vsc = new tc.videoController(video);
  });

  const frameTags = target.querySelectorAll("iframe");
  Array.prototype.forEach.call(frameTags, function (frame) {
    // Ignore frames we don't have permission to access (different origin).
    try {
      var childDocument = frame.contentDocument;
    } catch {
      return;
    }
    initHandler(childDocument);
  });

  log("End initializeNow", 5);
}

function setupListener() {
  /**
   * This function is run whenever a video speed rate change occurs.
   * It is used to update the speed that shows up in the display as well as save
   * that latest speed into the local storage.
   *
   * @param {*} video The video element to update the speed indicators for.
   */
  const updateSpeedFromEvent = (video: HTMLVideoElement) => {
    // It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
    // a video controller attached to it.  If we do, ignore it.
    if (!video.vsc) return;

    const speedIndicator = video.vsc.speedIndicator;
    const src = video.currentSrc;
    const speed = Number(video.playbackRate.toFixed(2));

    log("Playback rate changed to " + speed, 4);

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
  };

  document.addEventListener(
    "ratechange",
    (event) => {
      if (coolDown) {
        log("Speed event propagation blocked", 4);
        event.stopImmediatePropagation();
      }

      const video = event.target;

      updateSpeedFromEvent(video);
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

function getKeyBindings(action, what = "value") {
  try {
    return settings.keyBindings.find((item) => item.action === action)[what];
  } catch {
    return false;
  }
}

function setKeyBindings(action, value) {
  settings.keyBindings.find((item) => item.action === action).value = value;
}

function defineVideoController() {
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
  tc.videoController = function (target, parent) {
    if (target.vsc) {
      return target.vsc;
    }

    tc.mediaElements.push(target);

    this.video = target;
    this.parent = target.parentElement || parent;
    storedSpeed = settings.speeds[target.currentSrc];
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

    this.div = this.initializeControls();

    const mediaEventAction = function (event) {
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
        if (!(
          mutation.type === "attributes" &&
          (mutation.attributeName === "src" ||
            mutation.attributeName === "currentSrc")
        ))
          continue;

        log("mutation of A/V element", 5);
        const controller = this.div;
        controller.classList.toggle(
          "vsc-nosource",
          !mutation.target.src && !mutation.target.currentSrc,
        );
      }
    });
    observer.observe(target, {
      attributeFilter: ["src", "currentSrc"],
    });
  };

  tc.videoController.prototype.remove = function () {
    this.div.remove();
    this.video.removeEventListener("play", this.handlePlay);
    this.video.removeEventListener("seek", this.handleSeek);
    delete this.video.vsc;
    const idx = tc.mediaElements.indexOf(this.video);
    if (idx != -1) {
      tc.mediaElements.splice(idx, 1);
    }
  };

  tc.videoController.prototype.initializeControls = function () {
    log("initializeControls Begin", 5);
    const document = this.video.ownerDocument;
    const speed = this.video.playbackRate.toFixed(2);
    const top = Math.max(this.video.offsetTop, 0) + "px",
      left = Math.max(this.video.offsetLeft, 0) + "px";

    log("Speed variable set to: " + speed, 5);

    const wrapper = document.createElement("div");
    wrapper.classList.add("vsc-controller");

    if (!this.video.src && !this.video.currentSrc) {
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
    shadow.querySelector(".draggable").addEventListener(
      "mousedown",
      (e) => {
        runAction(e.target.dataset.action, false, e);
        e.stopPropagation();
      },
      { capture: true },
    );

    shadow.querySelectorAll("button").forEach(function (button) {
      button.addEventListener(
        "click",
        (e) => {
          runAction(
            e.target.dataset.action,
            getKeyBindings(e.target.dataset.action),
            e,
          );
          e.stopPropagation();
        },
        { capture: true },
      );
    });

    shadow
      .querySelector("#controller")
      .addEventListener("click", (e) => e.stopPropagation(), {
        capture: false,
      });
    shadow
      .querySelector("#controller")
      .addEventListener("mousedown", (e) => e.stopPropagation(), {
        capture: false,
      });

    this.speedIndicator = shadow.querySelector("span");
    const fragment = document.createDocumentFragment();
    fragment.append(wrapper);

    switch (true) {
      case location.hostname == "www.amazon.com":
      case location.hostname == "www.reddit.com":
      case location.hostname.includes("hbogo."): {
        // insert before parent to bypass overlay
        this.parent.parentElement.insertBefore(fragment, this.parent);
        break;
      }
      case location.hostname == "www.facebook.com": {
        // this is a monstrosity but new FB design does not have *any*
        // semantic handles for us to traverse the tree, and deep nesting
        // that we need to bubble up from to get controller to stack correctly
        const p =
          this.parent.parentElement.parentElement.parentElement.parentElement
            .parentElement.parentElement.parentElement;
        p.insertBefore(fragment, p.firstChild);
        break;
      }
      case location.hostname == "tv.apple.com": {
        // insert after parent for correct stacking context
        this.parent.getRootNode().querySelector(".scrim").prepend(fragment);
      }
      default: {
        // Note: when triggered via a MutationRecord, it's possible that the
        // target is not the immediate parent. This appends the controller as
        // the first element of the target, which may not be the parent.
        this.parent.insertBefore(fragment, this.parent.firstChild);
      }
    }
    return wrapper;
  };
}

function escapeStringRegExp(str) {
  const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  return str.replaceAll(matchOperatorsRe, String.raw`\$&`);
}

function isBlacklisted() {
  let blacklisted = false;
  for (let match of settings.blacklist.split("\n")) {
    match = match.replaceAll(regStrip, "");
    if (match.length === 0) continue;

    if (match.startsWith("/")) {
      try {
        var regexp = new RegExp(match);
      } catch {
        continue;
      }
    } else {
      var regexp = new RegExp(escapeStringRegExp(match));
    }

    if (regexp.test(location.href)) {
      blacklisted = true;
    }
  }
  return blacklisted;
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

function getShadow(parent) {
  const result = [];
  function getChild(parent) {
    if (!parent.firstElementChild) return;

    let child = parent.firstElementChild;
    do {
      result.push(child);
      getChild(child);
      if (child.shadowRoot) {
        result.push(getShadow(child.shadowRoot));
      }
      child = child.nextElementSibling;
    } while (child);
  }
  getChild(parent);
  return result.flat(Infinity);
}

function setSpeed(video, speed) {
  log("setSpeed started: " + speed, 5);

  const speedvalue = speed.toFixed(2);
  video.playbackRate = Number(speedvalue);

  const speedIndicator = video.vsc.speedIndicator;
  speedIndicator.textContent = speedvalue;
  settings.lastSpeed = speed;
  refreshCoolDown();
  log("setSpeed finished: " + speed, 5);
}

function runAction(action, value, e) {
  log("runAction Begin", 5);

  const mediaTags = tc.mediaElements;

  // Get the controller that was used if called from a button press event e
  if (e) {
    var targetController = e.target.getRootNode().host;
  }

  for (const v of mediaTags) {
    var controller = v.vsc.div;

    // Don't change video speed if the video has a different controller
    if (e && targetController != controller) {
      continue;
    }

    showController(controller);

    if (!v.classList.contains("vsc-cancelled")) {
      switch (action) {
        case "rewind": {
          log("Rewind", 5);
          v.currentTime -= value;

          break;
        }
        case "advance": {
          log("Fast forward", 5);
          v.currentTime += value;

          break;
        }
        case "faster": {
          log("Increase speed", 5);
          // Maximum playback speed in Chrome is set to 16:
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=166
          var s = Math.min(
            (v.playbackRate < 0.1 ? 0 : v.playbackRate) + value,
            16,
          );
          setSpeed(v, s);

          break;
        }
        case "slower": {
          log("Decrease speed", 5);
          // Video min rate is 0.0625:
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=165
          var s = Math.max(v.playbackRate - value, 0.07);
          setSpeed(v, s);

          break;
        }
        case "reset": {
          log("Reset speed", 5);
          resetSpeed(v, 1);

          break;
        }
        case "display": {
          log("Showing controller", 5);
          controller.classList.add("vsc-manual");
          controller.classList.toggle("vsc-hidden");

          break;
        }
        case "blink": {
          log("Showing controller momentarily", 5);
          // if vsc is hidden, show it briefly to give the use visual feedback that the action is excuted.
          if (
            controller.classList.contains("vsc-hidden") ||
            controller.blinkTimeOut !== undefined
          ) {
            clearTimeout(controller.blinkTimeOut);
            controller.classList.remove("vsc-hidden");
            controller.blinkTimeOut = setTimeout(
              () => {
                controller.classList.add("vsc-hidden");
                controller.blinkTimeOut = undefined;
              },
              value ? value : 1000,
            );
          }

          break;
        }
        case "drag": {
          handleDrag(v, e);

          break;
        }
        case "fast": {
          resetSpeed(v, value);

          break;
        }
        case "pause": {
          pause(v);

          break;
        }
        case "muted": {
          muted(v);

          break;
        }
        case "mark": {
          setMark(v);

          break;
        }
        case "jump": {
          jumpToMark(v);

          break;
        }
      }
    }
  }
  log("runAction End", 5);
}

function pause(v) {
  if (v.paused) {
    log("Resuming video", 5);
    v.play();
  } else {
    log("Pausing video", 5);
    v.pause();
  }
}

function resetSpeed(v, target) {
  if (v.playbackRate === target) {
    if (v.playbackRate === getKeyBindings("reset")) {
      if (target === 1) {
        log('Toggling playback speed to "fast" speed', 4);
        setSpeed(v, getKeyBindings("fast"));
      } else {
        log("Resetting playback speed to 1.0", 4);
        setSpeed(v, 1);
      }
    } else {
      log('Toggling playback speed to "reset" speed', 4);
      setSpeed(v, getKeyBindings("reset"));
    }
  } else {
    log('Toggling playback speed to "reset" speed', 4);
    setKeyBindings("reset", v.playbackRate);
    setSpeed(v, target);
  }
}

function muted(v) {
  v.muted = v.muted !== true;
}

function setMark(v) {
  log("Adding marker", 5);
  v.vsc.mark = v.currentTime;
}

function jumpToMark(v) {
  log("Recalling marker", 5);
  if (v.vsc.mark && typeof v.vsc.mark === "number") {
    v.currentTime = v.vsc.mark;
  }
}

function handleDrag(video, e) {
  const controller = video.vsc.div;
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

  video.classList.add("vcs-dragging");
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
    video.classList.remove("vcs-dragging");
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
