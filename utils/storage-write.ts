import type { Settings } from "@/types/settings.types";
import { getSettings, settingsStorage } from "./storage";
import type { PartialDeep } from "type-fest";
import { merge } from "./util";

async function lock(callback: () => Promise<void>) {
  await navigator.locks.request("storage", callback);
}

export async function setSettings(
  value: PartialDeep<Settings> | (() => Promise<PartialDeep<Settings>>),
) {
  await lock(async () => {
    const settings = await getSettings();
    const newSettings = typeof value === "function" ? await value() : value;

    await settingsStorage.setValue(merge(settings, newSettings));
  });
}
