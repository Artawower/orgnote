<template>
  <div
    :class="['resize-splitter', orientation, { active, absolute }]"
    role="separator"
    :aria-orientation="orientation"
    @mousedown="onMouseDown"
  />
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical';
    active?: boolean;
    absolute?: boolean;
  }>(),
  {
    orientation: 'horizontal',
    active: false,
    absolute: false,
  },
);

const emit = defineEmits<{
  'resize-start': [e: MouseEvent];
}>();

const onMouseDown = (e: MouseEvent): void => {
  emit('resize-start', e);
};
</script>

<style scoped lang="scss">
.resize-splitter {
  flex-shrink: 0;
  background: var(--splitter-bg);
  transition:
    background var(--splitter-transition-duration) ease,
    transform var(--splitter-transition-duration) ease;
  z-index: 1;

  &.absolute {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
  }

  &.horizontal {
    width: var(--splitter-size);
    height: 100%;
    cursor: col-resize;

    @include hover {
      background: var(--splitter-hover-bg);
      transform: scaleX(var(--splitter-hover-scale));
    }

    &.active {
      background: var(--splitter-hover-bg);
      transform: scaleX(var(--splitter-hover-scale));
    }
  }

  &.vertical {
    width: 100%;
    height: var(--splitter-size);
    cursor: row-resize;

    @include hover {
      background: var(--splitter-hover-bg);
      transform: scaleY(var(--splitter-hover-scale));
    }

    &.active {
      background: var(--splitter-hover-bg);
      transform: scaleY(var(--splitter-hover-scale));
    }
  }
}
</style>
