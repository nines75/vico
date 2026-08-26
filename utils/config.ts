import type { Settings } from "@/types/settings.types";

export const defaultSettings: Settings = {
  enabled: true,
  speed: 1,
  lastSpeed: 1,
  displayKeyCode: 86,
  rememberSpeed: false,
  audioBoolean: false,
  startHidden: false,
  controllerOpacity: 0.3,
  defaultLogLevel: 4,
  logLevel: 3,
  blacklist: "",
  keyBindings: {
    display: {
      action: "display",
      key: 86, // V
      value: 0,
      force: false,
      predefined: true,
    },
    slower: {
      action: "slower",
      key: 83, // S
      value: 0.1,
      force: false,
      predefined: true,
    },
    faster: {
      action: "faster",
      key: 68, // D
      value: 0.1,
      force: false,
      predefined: true,
    },
    rewind: {
      action: "rewind",
      key: 90, // Z
      value: 10,
      force: false,
      predefined: true,
    },
    advance: {
      action: "advance",
      key: 88, // X
      value: 10,
      force: false,
      predefined: true,
    },
    reset: {
      action: "reset",
      key: 82, // R
      value: 1,
      force: false,
      predefined: true,
    },
    fast: {
      action: "fast",
      key: 71, // G
      value: 1.8,
      force: false,
      predefined: true,
    },
  },
};
