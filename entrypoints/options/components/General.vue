<script lang="ts" setup>
import type { KeybindingName } from "@/types/settings.types";
import { catchAsync } from "@/utils/util";
import H2 from "./H2.vue";
import { getSettings } from "@/utils/storage.ts";
import type { Backup } from "@/types/backup.types.ts";
import { browser, useTemplateRef } from "#imports";
import { useSettings } from "../composables/UseSettings.ts";

const { settings, saveSettings } = useSettings();
const inputRef = useTemplateRef("inputRef");

async function recordKey(pointerEvent: PointerEvent, type: KeybindingName) {
  const isSaved = await saveSettings({ keybindings: { [type]: { key: "" } } });
  if (!isSaved) return;

  const element = pointerEvent.target as HTMLElement;
  element.addEventListener(
    "keydown",
    catchAsync(async (event) => {
      event.preventDefault();

      if (event.altKey || event.ctrlKey || event.metaKey) return;

      await saveSettings({ keybindings: { [type]: { key: event.key } } });
    }),
    { once: true },
  );
}

async function importBackup(event: Event) {
  const text = await (event.target as HTMLInputElement).files?.[0]?.text();
  if (text === undefined) return;

  const backup = JSON.parse(text) as Backup;
  if (backup.settings === undefined) return;

  await saveSettings(backup.settings);
}

async function exportBackup() {
  const rawSettings = await getSettings();

  const backup: Required<Backup> = { settings: rawSettings };
  const backupStr = JSON.stringify(backup);

  const blob = new Blob([backupStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const fileName = `${browser.runtime.getManifest().name}-backup.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
}
</script>

<template>
  <div class="setting">
    <label class="setting-label">
      <input
        :checked="settings.enabled"
        type="checkbox"
        @change="saveSettings({ enabled: !settings.enabled })"
      />
      Enabled
    </label>
  </div>
  <H2 name="Keybindings">
    <div
      v-for="type in ['slower', 'faster', 'reset']"
      :key="type"
      class="setting"
    >
      <label class="setting-label">
        <span class="keybinding-name">{{ type }}:</span>
        <button class="keybinding-button" @click="recordKey($event, type)">
          <template v-if="settings.keybindings[type].key === ''">
            press a key
          </template>
          <template v-else>
            {{ settings.keybindings[type].key }}
          </template>
        </button>
      </label>
      <label>
        <input
          class="keybinding-input"
          type="number"
          size="5"
          min="0"
          max="16"
          step="0.1"
          :value="settings.keybindings[type].value"
          @input="
            (event) =>
              saveSettings({
                keybindings: {
                  [type]: {
                    value: Number((event.target as HTMLInputElement).value),
                  },
                },
              })
          "
        />
      </label>
    </div>
  </H2>
  <H2 name="Backup">
    <button class="button" @click="() => inputRef?.click()">Import</button>
    <button class="button" @click="exportBackup">Export</button>
    <input
      ref="inputRef"
      type="file"
      accept=".json"
      class="input"
      @change="importBackup"
    />
  </H2>
</template>

<style scoped>
.keybinding-name {
  display: inline-block;
  width: 60px;
}
.keybinding-button {
  padding: 5px 10px;
  margin-inline: 10px;
  width: 200px;
  white-space-collapse: preserve;
}
.input {
  display: none;
}
</style>
