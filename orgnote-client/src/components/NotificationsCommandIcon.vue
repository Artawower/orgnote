<template>
  <app-flex class="notifications-icon-wrapper" inline>
    <app-icon name="sym_o_notifications" size="sm" />
    <app-flex center v-if="unreadCount" class="notifications-dot">
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import AppIcon from './AppIcon.vue';
import AppFlex from './AppFlex.vue';

const notificationsStore = api.core.useNotifications();
const { notifications } = storeToRefs(notificationsStore);

const unreadCount = computed(() => notifications.value.filter((n) => !n.readAt).length);
</script>

<style lang="scss" scoped>
.notifications-icon-wrapper {
  position: relative;
}

.notifications-dot {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(30%, -30%);
  min-width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: var(--red);
  color: var(--white);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-sm);
  pointer-events: none;
  box-sizing: border-box;
}
</style>
