export interface Settings {
  enabled: boolean;
  speed: number;
  displayKeyCode: number;
  startHidden: boolean;
  controllerOpacity: number;
  blacklist: string;
  defaultLogLevel: number;
  logLevel: number;
  keyBindings: Record<KeyBindingName, KeyBinding>;
}

export type KeyBindingName =
  "display" | "slower" | "faster" | "rewind" | "advance" | "reset";

interface KeyBinding {
  key: number;
  value: number;
  force: boolean;
  predefined: boolean;
}
