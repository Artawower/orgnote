import { BaseOrgWidget } from './base-org-widget';
import type { Range } from '@codemirror/state';
import type { EditorView, WidgetType } from '@codemirror/view';
import { Decoration } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import type { EmbeddedWidget, InlineEmbeddedWidget } from 'orgnote-api';

export class OrgInlineWidget extends BaseOrgWidget {
  private widget: EmbeddedWidget | undefined;
  private wrapElement: HTMLElement | undefined;

  constructor(
    view: EditorView,
    orgNode: OrgNode,
    private readonly inlineWidget: InlineEmbeddedWidget,
    rootNodeSrc: () => OrgNode | null,
    private readonly readonly: boolean,
  ) {
    super(view, rootNodeSrc, orgNode, inlineWidget);
  }

  public static init(
    view: EditorView,
    orgNode: OrgNode,
    inlineWidget: InlineEmbeddedWidget,
    rootNodeSrc: () => OrgNode | null,
    readonly: boolean,
  ): Range<Decoration> | undefined {
    const realText = view.state.doc.toString().slice(orgNode.start, orgNode.end);

    if (realText !== orgNode.rawValue) {
      return;
    }

    const [startOffset, endOffset] = inlineWidget.showRangeOffset ?? [0, 0];

    return Decoration[inlineWidget.decorationType]({
      widget: new OrgInlineWidget(view, orgNode, inlineWidget, rootNodeSrc, readonly),
      side: inlineWidget.side,
      class: inlineWidget.classBuilder?.(orgNode),
      inclusive: inlineWidget.inclusive,
    }).range(orgNode.start + startOffset, orgNode.end + endOffset);
  }

  public override eq(other: WidgetType): boolean {
    const otherWidget = other as unknown as OrgInlineWidget;
    const otherNode = otherWidget.orgNode;
    return (
      otherNode.rawValue === this.orgNode.rawValue &&
      otherNode.parent?.type === this.orgNode.parent?.type &&
      otherNode.children?.length === this.orgNode.children?.length
    );
  }

  private getCurrentRange(): { from: number; to: number } | undefined {
    const nodeLength = this.orgNode.end - this.orgNode.start;

    if (!this.wrapElement) {
      return { from: this.orgNode.start, to: this.orgNode.end };
    }

    const [startOffset = 0] = this.inlineWidget.showRangeOffset ?? [0, 0];
    const from = this.view.posAtDOM(this.wrapElement) - startOffset;
    const to = from + nodeLength;
    const currentText = this.view.state.doc.sliceString(from, to);

    if (currentText !== this.orgNode.rawValue) {
      return;
    }

    return { from, to };
  }

  override toDOM(): HTMLElement {
    const wrap = document.createElement(this.inlineWidget.wrapComponent ?? 'span');
    this.wrapElement = wrap;

    this.widget = this.embeddedWidget.widgetBuilder?.({
      wrap,
      orgNode: this.orgNode,
      rootNodeSrc: this.rootNodeSrc,
      onUpdateFn: (newValue) => {
        const range = this.getCurrentRange();
        if (!range) return;
        this.updateValueAt(newValue, range.from, range.to);
      },
      editorView: this.view as never,
      readonly: this.readonly,
    });

    return wrap;
  }

  override destroy(): void {
    this.widget?.destroy();
    this.wrapElement = undefined;
  }
}
