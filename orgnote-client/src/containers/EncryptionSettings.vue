<template>
  <settings-scheme
    :scheme="encryptionScheme"
    path="encryption"
    :before-type-change="confirmEncryptionChange"
  />
  <template v-if="config.encryption?.type === 'gpgKeys'">
    <menu-group>
      <menu-item type="danger" @click="handleGenerateKeys">
        {{ t(I18N.GENERATE_GPG_KEYS) }}
      </menu-item>
    </menu-group>
    <app-description>
      {{ t(I18N.ENCRYPTION_KEYS_GEN_WARNING) }}
    </app-description>
  </template>
</template>

<script lang="ts" setup>
import { ORG_NOTE_CONFIG_SCHEMA, DefaultCommands, I18N } from 'orgnote-api';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import AppDescription from 'src/components/AppDescription.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import { useI18n } from 'vue-i18n';
import MenuItem from './MenuItem.vue';
import SettingsScheme from './SettingsScheme.vue';
import { valibotScheme } from 'src/models/valibot-scheme';
import { useEncryptedNotesWarning } from 'src/composables/use-encrypted-notes-warning';

const encryptionIntersect = ORG_NOTE_CONFIG_SCHEMA.entries.encryption;
const unionScheme = encryptionIntersect.options.find((o: { type: string }) => o.type === 'union');
const encryptionScheme = valibotScheme(unionScheme ?? encryptionIntersect);

const { config } = storeToRefs(api.core.useConfig());
const { confirmEncryptionChange } = useEncryptedNotesWarning();

const handleGenerateKeys = () => {
  api.core.useCommands().execute(DefaultCommands.GENERATE_GPG_KEYS);
};

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>
