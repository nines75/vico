import { storage } from "#imports";
import type { Settings } from "@/types/settings.types";
import { defaultSettings } from "./config";
import type { PartialDeep } from "type-fest";
import { merge } from "./util";

export const settingsStorage = storage.defineItem<PartialDeep<Settings>>(
  "local:settings",
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

  return merge(defaultSettings, settings) as Settings;
}
