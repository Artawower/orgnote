<template>
  <div class="interface-settings">
    <settings-scheme :name="t(I18N.COMMON)" :scheme="commonScheme" path="ui"></settings-scheme>
    <settings-scheme :name="t(I18N.NOTIFICATIONS)" :scheme="notificationScheme" path="ui"></settings-scheme>
    <settings-scheme :name="t(I18N.THEMES)" :scheme="themeScheme" path="ui"></settings-scheme>
    <app-description padded>
      {{ t(I18N.FONTS).toUpperCase() }}
    </app-description>
    <font-settings />
    <settings-scheme :name="t(I18N.EDITOR)" :scheme="editorScheme" path="editor"></settings-scheme>
    <settings-scheme
      :name="t(I18N.COMPLETION)"
      :scheme="completionScheme"
      path="completion"
    ></settings-scheme>
  </div>
</template>

<script lang="ts" setup>
import SettingsScheme from './SettingsScheme.vue';
import FontSettings from './FontSettings.vue';
import { useI18n } from 'vue-i18n';
import { I18N, ORG_NOTE_CONFIG_SCHEMA } from 'orgnote-api';
import { omitSchemeKeys, pickSchemeKeys, valibotScheme } from 'src/models/valibot-scheme';
import AppDescription from 'src/components/AppDescription.vue';

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const themeKeys = ['theme', 'darkThemeName', 'lightThemeName'] as const;
const fontKeys = ['fonts'] as const;
const notificationKeys = ['notificationTimeout', 'minNotificationLevel'] as const;
const excludedFromCommon = [...themeKeys, ...fontKeys, ...notificationKeys] as const;

const commonScheme = omitSchemeKeys(ORG_NOTE_CONFIG_SCHEMA.entries.ui, [...excludedFromCommon]);
const notificationScheme = pickSchemeKeys(ORG_NOTE_CONFIG_SCHEMA.entries.ui, [...notificationKeys]);
const themeScheme = pickSchemeKeys(ORG_NOTE_CONFIG_SCHEMA.entries.ui, [...themeKeys]);

const editorScheme = valibotScheme(ORG_NOTE_CONFIG_SCHEMA.entries.editor);
const completionScheme = valibotScheme(ORG_NOTE_CONFIG_SCHEMA.entries.completion);
</script>

<style lang="scss" scoped>
.interface-settings {
  width: 100%;
}
</style>
