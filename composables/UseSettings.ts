import { ref } from "#imports";
import type { Settings } from "@/types/settings.types";
import { loadSettings } from "@/utils/storage";
import { setSettings } from "@/utils/storage-write";
import { merge } from "@/utils/util";
import type { PartialDeep } from "type-fest";

const settings = ref(await loadSettings());

const saveSettings = async (newSettings: PartialDeep<Settings>) => {
  const currentSettings = settings.value;
  settings.value = merge(currentSettings, newSettings);

  try {
    await setSettings(newSettings);
  } catch (error) {
    settings.value = currentSettings;
    console.error(error);

    return false; // failure
  }

  return true; // success
};

export function useSettings() {
  return {
    settings,
    saveSettings,
  };
}
