import { storage } from "#imports";
import type { Settings } from "@/types/settings.types";
import { defaultSettings } from "./config";
import defu from "defu";
import type { PartialDeep } from "type-fest";

export const settingsStorage = storage.defineItem<PartialDeep<Settings>>(
  `local:settings`,
  {
    init: () => {
      return {};
    },
  },
);

export async function getSettings() {
  return await settingsStorage.getValue();
}

export async function loadSettings(): Promise<Settings> {
  const settings = await getSettings();

  return defu(settings, defaultSettings);
}
