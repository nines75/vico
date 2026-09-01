<script lang="ts" setup>
import { computed, ref, toRaw } from "#imports";
import { useSettings } from "@/composables/UseSettings";
import { parsePattern } from "@/entrypoints/content/filter";
import { isString } from "@/utils/util";

const { settings, saveSettings } = useSettings();
const input = ref("");

const parsedRules = computed(() =>
  settings.value.filter.rules.map((rule) => {
    return { result: parsePattern(rule.pattern), ...rule };
  }),
);

const onSubmit = async () => {
  if (input.value === "") return;

  if (parsePattern(input.value).type === "invalid") {
    alert("invalid regex");

    return;
  }

  await saveSettings({
    filter: {
      rules: [
        { id: crypto.randomUUID(), pattern: input.value },
        ...toRaw(settings.value.filter.rules),
      ],
    },
  });

  input.value = "";
};
</script>

<template>
  <div>
    <button
      class="button"
      @click="
        saveSettings({
          filter: {
            mode:
              settings.filter.mode === 'blacklist' ? 'whitelist' : 'blacklist',
          },
        })
      "
    >
      Switch mode
    </button>
    <span class="info">
      {{ "current mode: " }}
      <span class="info-value">{{ settings.filter.mode }}</span>
    </span>
  </div>
  <div class="form">
    <form @submit.prevent="onSubmit">
      <input v-model="input" placeholder="Enter a pattern" class="form-input" />
    </form>
    <span class="form-description">
      Standard rules are evaluated by exact match against
      <code>location.hostname</code>.<br />
      Regex rules must be specified in the
      <code>/&lt;pattern&gt;/&lt;flag&gt;</code> format and are evaluated
      against <code>location.href</code>.
    </span>
  </div>
  <div class="rule-container">
    <div v-for="{ id, pattern, result } in parsedRules" :key="id" class="rule">
      <button
        class="rule-delete-button"
        @click="
          saveSettings({
            filter: {
              rules: settings.filter.rules
                .filter(({ id: targetId }) => targetId !== id)
                .map(toRaw),
            },
          })
        "
      >
        ✕
      </button>
      <template v-if="result.type === 'invalid'">
        <span class="rule-invalid">{{ pattern }}</span>
        <span class="info">(invalid)</span>
      </template>
      <template v-else>
        <template v-if="isString(result.pattern)">
          {{ pattern }}
        </template>
        <template v-else>
          <span class="rule-regex">{{ pattern }}</span>
          <span class="info">(regex)</span>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  align-items: center;
}
.form-input {
  margin: 10px;
  padding: 10px;
  width: 300px;
}
.form-description {
  font-size: 14px;
  color: silver;
  code {
    font-weight: bold;
  }
}
.rule-container {
  border: gray 1px solid;
  border-radius: 10px;
  font-family: var(--font);
}
.rule {
  font-size: 25px;
  padding: 10px 20px;
  margin: 10px;
  border: gray 3px solid;
  border-radius: 10px;
  overflow-x: auto;
  text-wrap-mode: nowrap;
  display: flex;
  gap: 10px;
}
.rule-delete-button {
  border: none;
  color: gray;
}
.rule-invalid {
  color: red;
}
.rule-regex {
  color: orange;
}
</style>
