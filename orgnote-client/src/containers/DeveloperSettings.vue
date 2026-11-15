<template>
  <settings-scheme :scheme="developmentScheme" path="developer"></settings-scheme>
</template>

<script lang="ts" setup>
import { ORG_NOTE_CONFIG_SCHEMA } from 'orgnote-api';
import SettingsScheme from './SettingsScheme.vue';
import { valibotScheme } from 'src/models/valibot-scheme';

const developmentScheme = valibotScheme({ ...ORG_NOTE_CONFIG_SCHEMA.entries.developer });
</script>
