<template>
  <div
    v-context-hold="contextHoldBinding"
    class="context-menu-trigger"
    @contextmenu.stop.prevent="handleContextMenu"
  >
    <slot />
    <q-menu
      v-if="!disabled && !desktopBelow"
      ref="qMenuRef"
      class="context-menu"
      context-menu
      @hide="close"
    >
      <menu-list :actions="actions" :data="data" @close="close" />
    </q-menu>
  </div>
</template>

<script lang="ts" setup>
import { QMenu } from 'quasar';
import { computed, ref } from 'vue';
import type { MenuAction, MenuGroup } from 'orgnote-api';
import MenuList from './MenuList.vue';
import { api } from 'src/boot/api';
import { vContextHold } from 'src/directives/context-hold';

const props = defineProps<{
  group: MenuGroup;
  data?: unknown;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  open: [];
}>();

const qMenuRef = ref<InstanceType<typeof QMenu>>();

const contextMenuStore = api.ui.useContextMenu();
const { desktopBelow } = api.ui.useScreenDetection();
const modal = api.ui.useModal();

const actions = computed<MenuAction[]>(() => contextMenuStore.getContextMenuActions(props.group));

const handleContextMenu = () => {
  if (desktopBelow.value) {
    openMobileMenu();
    return;
  }
  emit('open');
};

const openMobileMenu = () => {
  emit('open');
  modal.open(MenuList, {
      mini: true,
      position: 'bottom',
      noBodyPadding: true,
      modalProps: {
        actions: actions.value,
        data: props.data,
      },
      modalEmits: {
        close: () => modal.close(),
      },
    });
};

const openDesktopMenu = () => {
  emit('open');
  qMenuRef.value?.show();
};

const close = () => {
  qMenuRef.value?.hide();
};

const contextHoldBinding = computed(() => ({
  enabled: desktopBelow.value && !props.disabled,
  onHold: openMobileMenu,
}));

defineExpose({
  open: openDesktopMenu,
  close,
});
</script>

<style lang="scss" scoped>
.context-menu-trigger {
  display: contents;
  @include interactive-no-select;
}
</style>
