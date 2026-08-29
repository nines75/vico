import type { Settings } from "@/types/settings.types";

export const defaultSettings: Settings = {
  enabled: true,
  blacklist: "",
  keyBindings: {
    slower: {
      key: "s",
      value: 0.5,
    },
    faster: {
      key: "d",
      value: 0.5,
    },
    rewind: {
      key: "z",
      value: 10,
    },
    advance: {
      key: "x",
      value: 10,
    },
    reset: {
      key: "r",
      value: 1,
    },
  },
};
