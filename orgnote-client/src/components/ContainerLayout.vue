<template>
  <app-flex
    class="layout"
    :class="{ reverse }"
    direction="column"
    justify="start"
    align="stretch"
    :gap="gap ? `var(--gap-${gap})` : 'var(--layout-gap)'"
  >
    <div v-if="slots.header" class="layout-header" :class="{ border: headerBorder }">
      <slot name="header" />
    </div>
    <div
      class="layout-body"
      :class="{ scroll: bodyScroll, 'stable-scrollbar': bodyScroll && stableScrollbar }"
    >
      <slot name="body" />
      <slot />
    </div>
    <div v-if="slots.footer" class="layout-footer" :class="{ border: footerBorder }">
      <slot name="footer" />
    </div>
  </app-flex>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import type { StyleSize } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';

withDefaults(
  defineProps<{
    gap?: StyleSize;
    bodyScroll?: boolean;
    stableScrollbar?: boolean;
    reverse?: boolean;
    headerBorder?: boolean;
    footerBorder?: boolean;
  }>(),
  {
    bodyScroll: true,
    stableScrollbar: false,
    reverse: false,
    headerBorder: false,
    footerBorder: false,
  },
);

const slots = useSlots();
</script>

<style scoped lang="scss">
.layout {
  & {
    @include fit;
  }
}

.layout-header,
.layout-footer {
  flex-shrink: 0;
}

.layout-header.border {
  border-bottom: var(--border-default);
}

.layout-footer.border {
  border-top: var(--border-default);
}

.layout-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;

  &.scroll {
    overflow-y: auto;
  }

  &.stable-scrollbar {
    scrollbar-gutter: stable;
  }
}

.layout.reverse {
  .layout-header {
    order: 2;

    &.border {
      border-bottom: none;
    }
  }

  .layout-body {
    order: 1;
  }

  .layout-footer {
    order: 0;

    &.border {
      border-top: none;
    }
  }
}
</style>
