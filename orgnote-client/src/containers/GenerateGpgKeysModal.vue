<template>
  <app-flex column start align-stretch gap="md">
    <menu-group>
      <menu-item @click="emailInputRef?.focus()">
        <input-field
          v-model="email"
          ref="emailInputRef"
          type="email"
          autocomplete="email"
          placeholder="email"
        />
      </menu-item>
      <menu-item @click="passphraseInputRef?.focus()">
        <input-field
          v-model="passphrase"
          ref="passphraseInputRef"
          type="password"
          :password-toggle="true"
          autocomplete="new-password"
          :placeholder="t(I18N.GPG_PASSPHRASE)"
        />
      </menu-item>
      <menu-item type="danger" @click="generate">
        {{ t(I18N.CONFIRM) }}
      </menu-item>
      <menu-item @click="modal.close()">
        {{ t(I18N.CANCEL) }}
      </menu-item>
    </menu-group>
  </app-flex>
</template>

<script setup lang="ts">
import { I18N } from 'orgnote-api';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import InputField from 'src/components/InputField.vue';
import AppFlex from 'src/components/AppFlex.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import { validateEmail } from 'src/utils/validate-email';
import MenuItem from './MenuItem.vue';

import type { GenerateGpgKeysModalResult } from 'src/models/gpg-keys-modal-result';

const props = defineProps<{
  email?: string;
}>();

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const modal = api.ui.useModal();
const notifications = api.core.useNotifications();
const email = ref(props.email ?? '');
const passphrase = ref('');
const emailInputRef = ref<typeof InputField | undefined>();
const passphraseInputRef = ref<typeof InputField | undefined>();

const generate = () => {
  const normalizedEmail = email.value.trim();
  const error = validateEmail(normalizedEmail, {
    required: t(I18N.GPG_EMAIL_REQUIRED),
    invalid: t(I18N.GPG_EMAIL_INVALID),
  });
  if (error) {
    notifications.notify({ message: error, level: 'warning' });
    return;
  }

  const normalizedPassphrase = passphrase.value.trim();
  const result: GenerateGpgKeysModalResult = {
    email: normalizedEmail,
  };

  if (normalizedPassphrase) {
    result.passphrase = normalizedPassphrase;
  }

  modal.close(result);
};
</script>
