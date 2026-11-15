<template>
  <card-wrapper padding>
    <app-flex center align-center>
      <div class="flex full-width column everything-fine items-center gap-16">
        <app-icon name="sentiment_satisfied" size="5em" color="green" />
        <app-title class="successful-title" size="2xl">{{ text }}</app-title>
      </div>
    </app-flex>
  </card-wrapper>
</template>

<script lang="ts" setup>
import AppFlex from './AppFlex.vue';
import AppIcon from './AppIcon.vue';
import AppTitle from './AppTitle.vue';
import CardWrapper from './CardWrapper.vue';

defineProps<{
  text?: string;
}>();
</script>

<style lang="scss" scoped>
.everything-fine {
  color: var(--green);
}
.successful-title {
  color: var(--green);
}
</style>
