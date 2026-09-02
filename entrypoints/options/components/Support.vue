<script lang="ts" setup>
import H2 from "./H2.vue";

const config = {
  link: [
    {
      name: "Repository",
      url: "https://github.com/nines75/vico",
    },
  ],
  contact: [
    {
      name: "Request/Bug Report",
      url: "https://github.com/nines75/vico/issues",
    },
    {
      name: "Question",
      url: "https://github.com/nines75/vico/discussions",
    },
  ],
};
</script>

<template>
  <H2 name="link">
    <template v-for="item in config.link" :key="item.name">
      <a class="button" :href="item.url" target="_blank">{{ item.name }}</a>
    </template>
  </H2>
  <H2 name="contact">
    <template v-for="item in config.contact" :key="item.name">
      <a class="button" :href="item.url" target="_blank">{{ item.name }}</a>
    </template>
  </H2>
</template>

<style scoped>
.button {
  text-decoration: none;
  color: inherit;
  &:hover {
    background-color: #54525d;
  }
}
</style>
