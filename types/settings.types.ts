export interface Settings {
  enabled: boolean;
  selectedSettingsTab: "General" | "Filter" | "Support";
  keybindings: Record<KeybindingName, Keybinding>;
  filter: {
    mode: "blacklist" | "whitelist";
    rules: Rule[];
  };
}

export type KeybindingName = "slower" | "faster" | "reset";

export interface Keybinding {
  key: string;
  value: number;
}

export interface Rule {
  id: string;
  pattern: string;
  enabled: boolean;
}
