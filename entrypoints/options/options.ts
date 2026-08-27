import { defaultSettings } from "@/utils/config";

const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

let keyBindings = [];

const keyCodeAliases = {
  0: "null",
  null: "null",
  undefined: "null",
  32: "Space",
  37: "Left",
  38: "Up",
  39: "Right",
  40: "Down",
  96: "Num 0",
  97: "Num 1",
  98: "Num 2",
  99: "Num 3",
  100: "Num 4",
  101: "Num 5",
  102: "Num 6",
  103: "Num 7",
  104: "Num 8",
  105: "Num 9",
  106: "Num *",
  107: "Num +",
  109: "Num -",
  110: "Num .",
  111: "Num /",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  186: ";",
  188: "<",
  189: "-",
  187: "+",
  190: ">",
  191: "/",
  192: "~",
  219: "[",
  220: "\\",
  221: "]",
  222: "'",
  59: ";",
  61: "+",
  173: "-",
};

function recordKeyPress(e) {
  if (
    (e.keyCode >= 48 && e.keyCode <= 57) || // Numbers 0-9
    (e.keyCode >= 65 && e.keyCode <= 90) || // Letters A-Z
    keyCodeAliases[e.keyCode] // Other character keys
  ) {
    e.target.value =
      keyCodeAliases[e.keyCode] || String.fromCharCode(e.keyCode);
    e.target.keyCode = e.keyCode;

    e.preventDefault();
    e.stopPropagation();
  } else if (e.keyCode === 8) {
    // Clear input when backspace pressed
    e.target.value = "";
  } else if (e.keyCode === 27) {
    // When esc clicked, clear input
    e.target.value = "null";
    e.target.keyCode = null;
  }
}

function inputFilterNumbersOnly(e) {
  const char = String.fromCharCode(e.keyCode);
  if (!/[\d.]$/.test(char) || !/^\d+(\.\d*)?$/.test(e.target.value + char)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function inputFocus(e) {
  e.target.value = "";
}

function inputBlur(e) {
  e.target.value =
    keyCodeAliases[e.target.keyCode] || String.fromCharCode(e.target.keyCode);
}

function updateShortcutInputText(inputId, keyCode) {
  document.getElementById(inputId).value =
    keyCodeAliases[keyCode] || String.fromCharCode(keyCode);
  document.getElementById(inputId).keyCode = keyCode;
}

function updateCustomShortcutInputText(inputItem, keyCode) {
  inputItem.value = keyCodeAliases[keyCode] || String.fromCharCode(keyCode);
  inputItem.keyCode = keyCode;
}

// List of custom actions for which customValue should be disabled
const customActionsNoValues = new Set([
  "display",
]);

function add_shortcut() {
  const html = `<select class="customDo">
    <option value="slower">Decrease speed</option>
    <option value="faster">Increase speed</option>
    <option value="rewind">Rewind</option>
    <option value="advance">Advance</option>
    <option value="reset">Reset speed</option>
    <option value="display">Show/hide controller</option>
    </select>
    <input class="customKey" type="text" placeholder="press a key"/>
    <input class="customValue" type="text" placeholder="value (0.10)"/>
    <select class="customForce">
    <option value="false">Do not disable website key bindings</option>
    <option value="true">Disable website key bindings</option>
    </select>
    <button class="removeParent">X</button>`;
  const div = document.createElement("div");
  div.setAttribute("class", "row customs");
  div.innerHTML = html;
  const customs_element = document.querySelector("#customs");
  customs_element.insertBefore(
    div,
    customs_element.children[customs_element.childElementCount - 1],
  );
}

function createKeyBindings(item) {
  const action = item.querySelector(".customDo").value;
  const key = item.querySelector(".customKey").keyCode;
  const value = Number(item.querySelector(".customValue").value);
  const force = item.querySelector(".customForce").value;
  const predefined = !!item.id; //item.id ? true : false;

  keyBindings.push({
    action: action,
    key: key,
    value: value,
    force: force,
    predefined: predefined,
  });
}

// Validates settings before saving
function validate() {
  let valid = true;
  const status = document.querySelector("#status");
  document
    .querySelector("#blacklist")
    .value.split("\n")
    .forEach((match) => {
      match = match.replaceAll(regStrip, "");
      if (match.startsWith("/")) {
        try {
          const regexp = new RegExp(match);
        } catch {
          status.textContent =
            "Error: Invalid blacklist regex: " + match + ". Unable to save";
          valid = false;
          return;
        }
      }
    });
  return valid;
}

// Saves options to browser.storage
function save_options() {
  if (!validate()) {
    return;
  }
  keyBindings = [];
  for (const item of document.querySelectorAll(".customs")) {
    createKeyBindings(item);
  }
  // Remove added shortcuts

  const enabled = document.querySelector("#enabled").checked;
  const startHidden = document.querySelector("#startHidden").checked;
  const controllerOpacity = document.querySelector("#controllerOpacity").value;
  const blacklist = document.querySelector("#blacklist").value;

  browser.storage.local.remove([
    "resetSpeed",
    "speedStep",
    "rewindTime",
    "advanceTime",
    "resetKeyCode",
    "slowerKeyCode",
    "fasterKeyCode",
    "rewindKeyCode",
    "advanceKeyCode",
  ]);
  browser.storage.local.set(
    {
      enabled: enabled,
      startHidden: startHidden,
      controllerOpacity: controllerOpacity,
      keyBindings: keyBindings,
      blacklist: blacklist.replaceAll(regStrip, ""),
    },
    function () {
      // Update status to let user know options were saved.
      const status = document.querySelector("#status");
      status.textContent = "Options saved";
      setTimeout(function () {
        status.textContent = "";
      }, 1000);
    },
  );
}

// Restores options from browser.storage
function restore_options() {
  browser.storage.local.get(defaultSettings, function (storage) {
    document.querySelector("#enabled").checked = storage.enabled;
    document.querySelector("#startHidden").checked = storage.startHidden;
    document.querySelector("#controllerOpacity").value =
      storage.controllerOpacity;
    document.querySelector("#blacklist").value = storage.blacklist;

    // ensure that there is a "display" binding for upgrades from versions that had it as a separate binding
    if (storage.keyBindings.filter((x) => x.action == "display").length === 0) {
      storage.keyBindings.push({
        action: "display",
        value: 0,
        force: false,
        predefined: true,
      });
    }

    for (const i in storage.keyBindings) {
      const item = storage.keyBindings[i];
      if (item.predefined) {
        //do predefined ones because their value needed for overlay
        // document.querySelector("#" + item["action"] + " .customDo").value = item["action"];
        if (item.action == "display" && item.key === undefined) {
          item.key = storage.displayKeyCode || defaultSettings.displayKeyCode; // V
        }

        if (customActionsNoValues.has(item.action))
          document.querySelector("#" + item.action + " .customValue").disabled =
            true;

        updateCustomShortcutInputText(
          document.querySelector("#" + item.action + " .customKey"),
          item.key,
        );
        document.querySelector("#" + item.action + " .customValue").value =
          item.value;
        document.querySelector("#" + item.action + " .customForce").value =
          item.force;
      } else {
        // new ones
        add_shortcut();
        const dom = document.querySelector(".customs:last-of-type");
        dom.querySelector(".customDo").value = item.action;

        if (customActionsNoValues.has(item.action))
          dom.querySelector(".customValue").disabled = true;

        updateCustomShortcutInputText(
          dom.querySelector(".customKey"),
          item.key,
        );
        dom.querySelector(".customValue").value = item.value;
        dom.querySelector(".customForce").value = item.force;
      }
    }
  });
}

function restore_defaults() {
  browser.storage.local.set(defaultSettings, function () {
    restore_options();
    document
      .querySelectorAll(".removeParent")
      .forEach((button) => button.click()); // Remove added shortcuts
    // Update status to let user know options were saved.
    const status = document.querySelector("#status");
    status.textContent = "Default options restored";
    setTimeout(function () {
      status.textContent = "";
    }, 1000);
  });
}

function show_experimental() {
  document
    .querySelectorAll(".customForce")
    .forEach((item) => (item.style.display = "inline-block"));
}

document.addEventListener("DOMContentLoaded", function () {
  restore_options();

  document.querySelector("#save").addEventListener("click", save_options);
  document.querySelector("#add").addEventListener("click", add_shortcut);
  document
    .querySelector("#restore")
    .addEventListener("click", restore_defaults);
  document
    .querySelector("#experimental")
    .addEventListener("click", show_experimental);

  function eventCaller(event, className, funcName) {
    if (!event.target.classList?.contains(className)) {
      return;
    }
    funcName(event);
  }

  document.addEventListener("keypress", (event) => {
    eventCaller(event, "customValue", inputFilterNumbersOnly);
  });
  document.addEventListener("focus", (event) => {
    eventCaller(event, "customKey", inputFocus);
  });
  document.addEventListener("blur", (event) => {
    eventCaller(event, "customKey", inputBlur);
  });
  document.addEventListener("keydown", (event) => {
    eventCaller(event, "customKey", recordKeyPress);
  });
  document.addEventListener("click", (event) => {
    eventCaller(event, "removeParent", function () {
      event.target.parentNode.remove();
    });
  });
  document.addEventListener("change", (event) => {
    eventCaller(event, "customDo", function () {
      if (customActionsNoValues.has(event.target.value)) {
        event.target.nextElementSibling.nextElementSibling.disabled = true;
        event.target.nextElementSibling.nextElementSibling.value = 0;
      } else {
        event.target.nextElementSibling.nextElementSibling.disabled = false;
      }
    });
  });
});
