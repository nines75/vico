import type { Settings } from "@/types/settings.types";

export const defaultSettings: Settings = {
  enabled: true,
  speed: 1,
  displayKeyCode: 86,
  startHidden: false,
  controllerOpacity: 0.3,
  defaultLogLevel: 4,
  logLevel: 1,
  blacklist: "",
  keyBindings: {
    display: {
      key: 86, // V
      value: 0,
      force: false,
      predefined: true,
    },
    slower: {
      key: 83, // S
      value: 0.5,
      force: false,
      predefined: true,
    },
    faster: {
      key: 68, // D
      value: 0.5,
      force: false,
      predefined: true,
    },
    rewind: {
      key: 90, // Z
      value: 10,
      force: false,
      predefined: true,
    },
    advance: {
      key: 88, // X
      value: 10,
      force: false,
      predefined: true,
    },
    reset: {
      key: 82, // R
      value: 1,
      force: false,
      predefined: true,
    },
  },
};
