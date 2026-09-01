<script lang="ts" setup>
import Filter from "./components/Filter.vue";
import General from "./components/General.vue";
import Support from "./components/Support.vue";
import { useSettings } from "@/composables/UseSettings.ts";

const { settings, saveSettings } = useSettings();

const tabMap = {
  General,
  Filter,
  Support,
};
</script>

<template>
  <div class="tab-container">
    <div class="tab">
      <button
        v-for="item in ['General', 'Filter', 'Support']"
        :key="item"
        class="tab-button"
        :class="{ selected: item === settings.selectedSettingsTab }"
        @click="saveSettings({ selectedSettingsTab: item })"
      >
        {{ item }}
      </button>
    </div>
  </div>
  <component :is="tabMap[settings.selectedSettingsTab]"></component>
</template>

<style scoped>
.tab-container {
  padding-block: 10px;
  white-space: nowrap;

  /* fix to top */
  position: sticky;
  top: 0;
  background: var(--background);
  z-index: 1000;
}
.tab {
  width: fit-content;
  border-bottom: 2px solid gray;
}
.tab-button {
  border: none;
  padding: 12px;
  font-size: 25px;
  &.selected {
    color: lightskyblue;
    border-bottom: 2px solid lightskyblue;
    margin-bottom: -2px;
  }
}
</style>
