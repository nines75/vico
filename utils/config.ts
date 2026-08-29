import type { Settings } from "@/types/settings.types";

export const defaultSettings: Settings = {
  enabled: true,
  blacklist: "",
  keyBindings: {
    slower: {
      key: 83, // S
      value: 0.5,
    },
    faster: {
      key: 68, // D
      value: 0.5,
    },
    rewind: {
      key: 90, // Z
      value: 10,
    },
    advance: {
      key: 88, // X
      value: 10,
    },
    reset: {
      key: 82, // R
      value: 1,
    },
  },
};
