export interface Settings {
  enabled: boolean;
  blacklist: string;
  keyBindings: Record<KeyBindingName, KeyBinding>;
}

export type KeyBindingName =
  "slower" | "faster" | "rewind" | "advance" | "reset";

interface KeyBinding {
  key: number;
  value: number;
  force: boolean;
}
