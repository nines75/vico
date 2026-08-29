import type { Settings } from "@/types/settings.types";

export const defaultSettings: Settings = {
  enabled: true,
  blacklist: "",
  keyBindings: {
    slower: {
      key: 83, // S
      value: 0.5,
      force: false,
    },
    faster: {
      key: 68, // D
      value: 0.5,
      force: false,
    },
    rewind: {
      key: 90, // Z
      value: 10,
      force: false,
    },
    advance: {
      key: 88, // X
      value: 10,
      force: false,
    },
    reset: {
      key: 82, // R
      value: 1,
      force: false,
    },
  },
};
