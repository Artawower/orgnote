<template>
  <app-flex class="confirmation-modal" column start align-start gap="lg">
    <h5 v-if="title" class="title capitalize">{{ t(title) }}</h5>

    <card-wrapper v-if="message" padding>
      <div class="message capitalize">{{ t(message) }}</div>
    </card-wrapper>

    <app-flex class="actions" :column="tabletBelow" end align-center :gap="actionsGap">
      <menu-group>
        <menu-item type="danger" @click="resolver(true)">
          {{ t(confirmText ?? I18N.CONFIRM) }}
        </menu-item>
        <menu-item @click="resolver(false)">
          {{ t(cancelText ?? I18N.CANCEL) }}
        </menu-item>
      </menu-group>
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import type { ConfirmationModalParams } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';
import CardWrapper from './CardWrapper.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { useScreenDetection } from 'src/composables/use-screen-detection';
import { computed } from 'vue';

defineProps<
  {
    resolver: (data?: boolean) => void;
  } & ConfirmationModalParams
>();

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const { tabletBelow } = useScreenDetection();

const actionsGap = computed((): 'sm' | 'md' => (tabletBelow.value ? 'sm' : 'md'));
</script>

<style lang="scss" scoped>
.actions {
  @include tablet-below {
    button {
      width: 100%;
    }
  }

  & {
    width: 100%;
  }
}

.message {
  color: var(--fg);
  line-height: var(--line-height-md);
}
</style>
