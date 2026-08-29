import type { Settings } from "@/types/settings.types";

export const defaultSettings: Settings = {
  enabled: true,
  blacklist: "",
  keybindings: {
    slower: {
      key: "s",
      value: 0.5,
    },
    faster: {
      key: "d",
      value: 0.5,
    },
    reset: {
      key: "r",
      value: 1,
    },
  },
};
