<template>
  <card-wrapper padding class="src-code-wrapper">
    <highlightjs :code="code" autodetect />
  </card-wrapper>
</template>

<script setup lang="ts">
import CardWrapper from 'src/components/CardWrapper.vue';

defineProps<{
  code: string;
}>();
</script>

<style lang="scss" scoped>
.src-code-wrapper {
  pre {
    margin: 0 !important;

    code {
      padding: var(--src-block-padding-y, var(--padding-md))
        var(--src-block-padding-x, var(--padding-md));
      border-radius: var(--border-radius-sm);
    }
  }
}
</style>
