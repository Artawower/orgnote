<template>
  <div class="font-settings">
    <card-wrapper>
      <app-dropdown
        v-for="category in fontCategories"
        v-bind:key="category.id"
        :label="category.label"
        :model-value="getSelectedFont(category.id)"
        @update:model-value="(v) => handleFontChange(category.id, v)"
        :options="availableFonts"
        option-label="name"
        :use-input="false"
        :clearable="false"
        class="font-dropdown"
      >
        <template #selected="{ name, family }">
          <span :style="{ fontFamily: family }">{{ name }}</span>
        </template>
        <template #option="{ name, family }">
          <span :style="{ fontFamily: family }">{{ name }}</span>
        </template>
      </app-dropdown>
    </card-wrapper>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import type { FontCategory, FontDefinition } from 'orgnote-api';
import { api } from 'src/boot/api';
import CardWrapper from 'src/components/CardWrapper.vue';
import AppDropdown from 'src/components/AppDropdown.vue';

const fontStore = api.ui.useFonts();
const configStore = api.core.useConfig();
const { availableFonts, activeFonts } = storeToRefs(fontStore);
const { config } = storeToRefs(configStore);

const fontCategories: { id: FontCategory; label: string }[] = [
  { id: 'main', label: 'Main font' },
  { id: 'editor', label: 'Editor font' },
  { id: 'headline', label: 'Headline font' },
  { id: 'code', label: 'Code font' },
];

const getSelectedFont = (category: FontCategory): FontDefinition | undefined =>
  availableFonts.value.find((f) => f.family === activeFonts.value[category]);

const handleFontChange = (
  category: FontCategory,
  font: FontDefinition | FontDefinition[] | null | undefined,
) => {
  if (!font || Array.isArray(font)) return;
  if (!config.value.ui.fonts) {
    config.value.ui.fonts = {};
  }
  config.value.ui.fonts[category] = font.family;
};
</script>

<style lang="scss" scoped></style>
