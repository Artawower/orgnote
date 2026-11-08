<template>
  <slot name="default" v-if="isVisible" />
  <slot name="desktop-above" v-if="da"></slot>
  <slot name="desktop-below" v-else-if="db"></slot>
  <slot name="tablet-below" v-else-if="tb"></slot>
  <slot name="tablet-above" v-else-if="ta"></slot>
  <slot name="mobile" v-else-if="m"></slot>
</template>

<script lang="ts" setup>
import { useScreenDetection } from 'src/composables/use-screen-detection';
import { computed } from 'vue';

const props = defineProps<{
  desktopAbove?: boolean;
  desktopBelow?: boolean;
  tabletBelow?: boolean;
  tabletAbove?: boolean;
  mobile?: boolean;
}>();

const {
  tabletAbove: ta,
  desktopBelow: db,
  desktopAbove: da,
  mobile: m,
  tabletBelow: tb,
} = useScreenDetection();

const isVisible = computed(() => {
  return (
    (props.desktopAbove && da.value) ||
    (props.desktopBelow && db.value) ||
    (props.tabletBelow && tb.value) ||
    (props.tabletAbove && ta.value) ||
    (props.mobile && m.value)
  );
});
</script>
