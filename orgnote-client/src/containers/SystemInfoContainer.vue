<template>
  <safe-area fit>
    <container-layout gap="lg">
      <app-code class="code" :code="systemInfoText" />

      <template #footer>
        <menu-group>
          <menu-item type="info" @click="safeCopyToClipboard(systemInfoText)">
            {{ t(I18N.COPY) }}
          </menu-item>
        </menu-group>
      </template>
    </container-layout>
  </safe-area>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import AppCode from 'src/components/AppCode.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import SafeArea from 'src/components/SafeArea.vue';
import { useInteractiveClipboard } from 'src/composables/use-interactive-clipboard';
import { useSystemInfo } from 'src/composables/use-system-info';
import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const { safeCopyToClipboard } = useInteractiveClipboard();
const { getTextSystemInfo } = useSystemInfo();

const systemInfoText = ref('Loading...');

onMounted(async () => {
  systemInfoText.value = await getTextSystemInfo();
});
</script>

<style lang="scss" scoped>
.code {
  height: 100%;
  overflow: auto;
}
</style>
