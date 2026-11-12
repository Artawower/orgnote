<template>
  <app-flex column start align-start gap="sm" full-width>
    <menu-group>
      <menu-item @click="execute(DefaultCommands.DELETE_ALL_DATA)" type="danger">
        <div class="capitalize text-medium">{{ t(I18N.CLEAR_ALL_LOCAL_DATA) }}</div>
      </menu-item>
      <menu-item @click="execute(DefaultCommands.DELETE_ALL_NOTES)" type="danger">
        <div class="capitalize text-medium">{{ t(I18N.DELETE_ALL_NOTES) }}</div>
      </menu-item>
    </menu-group>
    <app-description :text="I18N.PURGE_DATA_WARNING" padded />
    <menu-group>
      <menu-item @click="execute(DefaultCommands.DELETE_ACCOUNT)" type="danger">
        <div class="capitalize text-medium">{{ t(I18N.REMOVE_ACCOUNT) }}</div>
      </menu-item>
    </menu-group>
    <app-description :text="I18N.REMOVE_ACCOUNT_WARNING" padded />
  </app-flex>
</template>

<script lang="ts" setup>
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from './MenuItem.vue';
import AppDescription from 'src/components/AppDescription.vue';
import AppFlex from 'src/components/AppFlex.vue';

import { useI18n } from 'vue-i18n';
import { I18N, DefaultCommands } from 'orgnote-api';
import { api } from 'src/boot/api';

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const { execute } = api.core.useCommands();
</script>
