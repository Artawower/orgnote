<template>
  <app-flex class="authentication-settings" column start align-start gap="md">
    <app-description padded>
      {{ t(I18N.AUTHENTICATION_STATUS) }}
    </app-description>

    <user-info v-if="user" :user="user" />

    <menu-group>
      <command-menu-item v-if="!user" :command="DefaultCommands.LOGIN" type="info">
        {{ t(I18N.AUTH_LOGIN) }}
      </command-menu-item>
      <command-menu-item v-else :command="DefaultCommands.LOGOUT">
        {{ t(I18N.AUTH_LOGOUT) }}
      </command-menu-item>
    </menu-group>

    <template v-if="user">
      <app-description>
        {{ t(I18N.AUTH_REMOVE_ACCOUNT_DESCRIPTION) }}
      </app-description>
      <menu-group>
        <command-menu-item :command="DefaultCommands.REMOVE_ACCOUNT" type="danger">
          {{ t(I18N.REMOVE_ACCOUNT) }}
        </command-menu-item>
      </menu-group>
      <app-card type="danger">
        {{ t(I18N.REMOVE_ACCOUNT_WARNING) }}
      </app-card>
    </template>
  </app-flex>
</template>

<script lang="ts" setup>
import { DefaultCommands, I18N } from 'orgnote-api';
import AppDescription from 'src/components/AppDescription.vue';
import { useI18n } from 'vue-i18n';
import MenuGroup from 'src/components/MenuGroup.vue';
import AppFlex from 'src/components/AppFlex.vue';
import CommandMenuItem from './CommandMenuItem.vue';
import { api } from 'src/boot/api';
import { storeToRefs } from 'pinia';
import UserInfo from 'src/components/UserInfo.vue';
import AppCard from 'src/components/AppCard.vue';

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const { user } = storeToRefs(api.core.useAuth());
</script>

<style lang="scss" scoped>
.authentication-settings {
  width: 100%;
}
</style>
