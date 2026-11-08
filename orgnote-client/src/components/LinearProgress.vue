<template>
  <q-linear-progress indeterminate :color="color" rounded :animationSpeed="500" />
</template>

<script lang="ts" setup>
withDefaults(defineProps<{ color?: string }>(), { color: 'accent' });
</script>
