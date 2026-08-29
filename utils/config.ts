import type { Settings } from "@/types/settings.types";

export const defaultSettings: Settings = {
  enabled: true,
  blacklist: "",
  keyBindings: {
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
