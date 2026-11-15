<template>
  <div class="language-settings">
    <app-description padded>
      {{ t(I18N.PICK_LANGUAGE).toUpperCase() }}
    </app-description>
    <menu-group>
      <menu-item v-for="(_, key) of messages" :key="key" :selected="key === locale">
        {{ key }}
      </menu-item>
    </menu-group>
  </div>
</template>

<script lang="ts" setup>
import MenuGroup from 'src/components/MenuGroup.vue';
import AppDescription from 'src/components/AppDescription.vue';
import MenuItem from './MenuItem.vue';
import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';

const { t, messages, locale } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.language-settings {
  width: 100%;
}
</style>
