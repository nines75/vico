<script lang="ts" setup>
defineProps<{ name: string }>();
</script>

<template>
  <section>
    <h2>{{ name }}</h2>
    <div class="settings-container">
      <slot />
    </div>
  </section>
</template>
