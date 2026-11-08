<template>
  <app-flex
    class="subscription-settings"
    direction="column"
    justify="start"
    align="center"
    gap="lg"
  >
    <template v-if="!user?.active">
      <menu-group>
        <menu-item @click="inputRef?.focus()">
          <app-input
            v-model="activationKey"
            ref="inputRef"
            :placeholder="t(I18N.SUBSCRIPTION_KEY)"
          />
        </menu-item>
        <menu-item @click="activate" :disabled="!activationKey" type="info">
          <div class="capitalize text-medium">{{ t(I18N.ACTIVATE) }}</div>
        </menu-item>
      </menu-group>

      <app-card type="info">
        <template #cardTitle>
          <div class="capitalize">
            {{ t(I18N.WANT_SUBSCRIPTION) }}
          </div>
        </template>
        <app-description>
          <p class="capitalize">{{ t(I18N.SEVERAL_OPTIONS) }}</p>
          <ul>
            <li>
              <app-link href="https://about.org-note.com" class="capitalize">{{
                t(I18N.SIGNUP_FOR_BETA)
              }}</app-link>
              {{ t(I18N.ACTIVE_TESTERS_KEY) }}
            </li>
            <li class="capitalize">
              {{ t(I18N.OPEN_SOURCE_DEVELOPER_WRITE) }}
            </li>
            <li class="capitalize">
              {{ t(I18N.TRY_OWN_SERVER) }}
            </li>
            <li class="capitalize">
              <app-link :href="PATREON_LINK">{{ t(I18N.SUBSCRIBE_PATREON) }}</app-link>
            </li>
          </ul>
        </app-description>
      </app-card>
    </template>

    <template v-else>
      <app-satisfied :text="t(I18N.SUCCESSFULLY_SUBSCRIBED)" />
      <app-progress
        v-if="hasStorageInfo"
        class="storage-section"
        padding
        :value="usedSpaceMb"
        :max="spaceLimitMb"
        :label="storageLabel"
        show-label
        size="lg"
        auto-variant
      />
    </template>
  </app-flex>
</template>

<script lang="ts" setup>
import AppInput from 'src/components/AppInput.vue';
import MenuItem from './MenuItem.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import MenuGroup from 'src/components/MenuGroup.vue';
import { ref, computed } from 'vue';
import { PATREON_LINK } from 'src/constants/external-link';
import AppCard from 'src/components/AppCard.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppLink from 'src/components/AppLink.vue';
import AppSatisfied from 'src/components/AppSatisfied.vue';
import AppProgress from 'src/components/AppProgress.vue';
import AppDescription from 'src/components/AppDescription.vue';
import { api } from 'src/boot/api';
import { storeToRefs } from 'pinia';
import { bytesToMegabytes } from 'src/utils/size-converter';

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const inputRef = ref<typeof AppInput | undefined>();

const authStore = api.core.useAuth();
const { user } = storeToRefs(authStore);

const activationKey = ref<string>('');

const activate = () => authStore.subscribe(activationKey.value);

const hasStorageInfo = computed(
  () => user.value?.usedSpace !== undefined && user.value?.spaceLimit !== undefined,
);

const usedSpaceMb = computed(() => bytesToMegabytes(user.value?.usedSpace ?? 0));
const spaceLimitMb = computed(() => bytesToMegabytes(user.value?.spaceLimit ?? 0));

const storageLabel = computed(
  () =>
    `${t(I18N.STORAGE)} (${usedSpaceMb.value.toFixed(2)} / ${spaceLimitMb.value.toFixed(2)} MB)`,
);
</script>

<style lang="scss" scoped>
.subscription-settings {
  width: 100%;
}

.storage-section {
  width: 100%;
}
</style>
