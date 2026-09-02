export interface Settings {
  enabled: boolean;
  selectedSettingsTab: settingsTab;
  filter: {
    mode: "blacklist" | "whitelist";
    rules: { id: string; pattern: string; enabled: boolean }[];
  };
  keybindings: Record<KeybindingName, Keybinding>;
}

export type settingsTab = "General" | "Filter" | "Support";

export type KeybindingName = "slower" | "faster" | "reset";

interface Keybinding {
  key: string;
  value: number;
}
