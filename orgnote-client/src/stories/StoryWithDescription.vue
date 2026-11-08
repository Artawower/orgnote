<template>
  <div class="story">
    <h1 v-if="title">{{ title }}</h1>
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  title?: string;
}>();
</script>
