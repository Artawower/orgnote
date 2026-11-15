<template>
  <app-flex class="task-details" column start align-stretch gap="md">
    <app-code class="code-block" @click="handleCopy" :code="formattedTaskData" />
    <menu-group class="actions">
      <menu-item @click="handleCopy" type="info">
        <app-flex row start align-center gap="md">
          {{ t(I18N.COPY) }}
        </app-flex>
      </menu-item>
      <menu-item @click="handleClose">
        <app-flex row start align-center gap="md">
          {{ t(i18n.CLOSE) }}
        </app-flex>
      </menu-item>
    </menu-group>
  </app-flex>
</template>

<script lang="ts" setup>
import { i18n, type QueueTask, I18N } from 'orgnote-api';
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import AppCode from 'src/components/AppCode.vue';
import { useI18n } from 'vue-i18n';
import { copyToClipboard } from 'src/utils/clipboard';
import { api } from 'src/boot/api';

const props = defineProps<{
  task: QueueTask;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const formattedTaskData = computed(() => JSON.stringify(props.task, null, 2));

const handleClose = () => {
  emit('close');
};

const handleCopy = async () => {
  await copyToClipboard(formattedTaskData.value);
  api.core.useNotifications().notify({
    message: t(I18N.COPIED_TO_CLIPBOARD),
    level: 'info',
    timeout: 2000,
  });
};
</script>

<style lang="scss" scoped>
.task-details {
  min-width: min(500px, 90vw);
  max-width: 600px;
}

.code-block {
  max-height: 60vh;
  overflow-y: auto;
  cursor: pointer;

  &:hover {
    :deep(.card-wrapper) {
      background: var(--bg-elevated);
    }
  }
}

.actions {
  margin-top: var(--margin-sm);
}
</style>
