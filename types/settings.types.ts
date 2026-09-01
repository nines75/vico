export interface Settings {
  enabled: boolean;
  filter: {
    mode: "blacklist" | "whitelist";
    rules: { id: string; pattern: string }[];
  };
  keybindings: Record<KeybindingName, Keybinding>;
}

export type KeybindingName = "slower" | "faster" | "reset";

interface Keybinding {
  key: string;
  value: number;
}
