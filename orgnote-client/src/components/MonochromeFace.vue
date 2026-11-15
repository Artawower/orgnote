<template>
  <span class="monochrome-face">
    <slot />
  </span>
</template>

<style lang="scss" scoped>
.monochrome-face {
  @include fontify(0.9em, normal, inherit);
  font-family: var(--code-font-family);
}
</style>
