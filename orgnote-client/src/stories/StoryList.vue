<template>
  <story-with-description :title="title">
    <div class="wrapper">
      <table class="wrapper-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="index">
            <td class="component-cell">
              <component :is="item.component" v-bind="item.props">
                <template
                  v-for="(slotContent, slotName) in item.slots || {}"
                  :key="slotName"
                  v-slot:[slotName]
                >
                  <component v-if="typeof slotContent === 'function'" :is="slotContent" />
                  <span v-else v-html-safe="slotContent" />
                </template>
              </component>
            </td>
            <td class="description-cell">
              {{ item.description }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </story-with-description>
</template>

<script setup lang="ts">
import type { VueComponent } from 'orgnote-api';
import StoryWithDescription from './StoryWithDescription.vue';

interface WrapperItem {
  component: VueComponent;
  props?: Record<string, unknown>;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slots?: Record<string, any>;
}

defineProps<{
  items: WrapperItem[];
  title?: string;
}>();
</script>

<style scoped>
.wrapper {
  padding: 16px;
  font-family: sans-serif;
}

.wrapper-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.wrapper-table th,
.wrapper-table td {
  border: 1px solid #ccc;
  padding: 8px;
  vertical-align: top;
}

.wrapper-table th {
  background-color: #f2f2f2;
}

.component-cell {
  width: 200px;
  text-align: center;
}

.props-cell {
  width: 250px;
  background-color: #fafafa;
  font-size: 14px;
  font-family: monospace;
  white-space: pre-wrap;
}

.description-cell {
  color: #555;
}
</style>
