import type { PartialDeep } from "type-fest";
import type { Settings } from "./settings.types";

export interface Backup {
  settings?: PartialDeep<Settings>;
}
