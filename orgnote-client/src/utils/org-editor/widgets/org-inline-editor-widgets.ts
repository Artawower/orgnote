import type { Component } from 'vue';
import { NodeType } from 'org-mode-ast';
import type { InlineEmbeddedWidgets, WidgetBuilder } from 'orgnote-api';
import OrgCheckbox from 'src/components/org-nodes/OrgCheckbox.vue';
import OrgHorizontalRule from 'src/components/org-nodes/OrgHorizontalRule.vue';

export const buildOrgInlineEditorWidgets = (
  createWidgetBuilder: (cmp: Component) => WidgetBuilder,
): InlineEmbeddedWidgets => ({
  [NodeType.Checkbox]: [
    {
      id: 'inline-checkbox',
      decorationType: 'replace',
      ignoreEvent: true,
      widgetBuilder: createWidgetBuilder(OrgCheckbox),
    },
  ],
  [NodeType.HorizontalRule]: [
    {
      id: 'inline-horizontal-rule',
      decorationType: 'replace',
      widgetBuilder: createWidgetBuilder(OrgHorizontalRule),
    },
  ],
});
