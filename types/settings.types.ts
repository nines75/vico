export interface Settings {
  enabled: boolean;
  speed: number;
  lastSpeed: number;
  displayKeyCode: number;
  rememberSpeed: boolean;
  startHidden: boolean;
  controllerOpacity: number;
  blacklist: string;
  defaultLogLevel: number;
  logLevel: number;
  keyBindings: Record<
    "display" | "slower" | "faster" | "rewind" | "advance" | "reset" | "fast",
    KeyBinding
  >;
}

interface KeyBinding {
  action: string;
  key: number;
  value: number;
  force: boolean;
  predefined: boolean;
}
