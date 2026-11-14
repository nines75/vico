export interface Settings {
  enabled: boolean;
  selectedSettingsTab: settingsTab;
  keybindings: Record<KeybindingName, Keybinding>;
  filter: {
    mode: "blacklist" | "whitelist";
    rules: Rule[];
  };
}

export type settingsTab = "General" | "Filter" | "Support";

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
