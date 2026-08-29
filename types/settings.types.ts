export interface Settings {
  enabled: boolean;
  blacklist: string;
  keyBindings: Record<KeyBindingName, KeyBinding>;
}

export type KeyBindingName = "slower" | "faster" | "reset";

interface KeyBinding {
  key: string;
  value: number;
}
