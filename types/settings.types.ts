export interface Settings {
  enabled: boolean;
  blacklist: string;
  keybindings: Record<KeybindingName, Keybinding>;
}

export type KeybindingName = "slower" | "faster" | "reset";

interface Keybinding {
  key: string;
  value: number;
}
