import type { CommonEmbeddedWidget } from 'orgnote-api';
import type { EditorView } from '@codemirror/view';
import { WidgetType } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import { useKeyboardState } from 'src/composables/use-viewport-behavior';
import { desktopOnly, mobileOnly } from 'src/utils/platform-specific';

export class BaseOrgWidget extends WidgetType {
  constructor(
    protected readonly view: EditorView,
    protected readonly rootNodeSrc: () => OrgNode | null,
    protected _orgNode: OrgNode,
    protected readonly embeddedWidget: CommonEmbeddedWidget,
  ) {
    super();
  }

  public get orgNode(): OrgNode {
    return this._orgNode;
  }

  public updateOrgNode(orgNode: OrgNode): void {
    this._orgNode = orgNode;
  }

  public toDOM(): HTMLElement {
    throw new Error('Method not implemented.');
  }

  protected updateValue(newVal: string): void {
    this.updateValueAt(newVal, this.orgNode.start, this.orgNode.end);
  }

  protected updateValueAt(newVal: string, from: number, to: number): void {
    const hadFocus = this.view.hasFocus;
    const { keyboardOpened } = useKeyboardState();
    const keyboardWasOpen = keyboardOpened.value;

    const cursorPosition = this.view.state.selection.main.head;
    const changes = this.embeddedWidget.viewUpdater?.(this.orgNode, newVal) ?? {
      from,
      to,
      insert: newVal,
    };

    const mappedCursor = this.view.state.changes(changes).mapPos(cursorPosition);

    this.view.dispatch({
      changes,
      selection: { anchor: mappedCursor },
    });

    mobileOnly(() => {
      if (keyboardWasOpen) {
        this.view.focus();
        return;
      }
      (document.activeElement as HTMLElement)?.blur();
    })();

    desktopOnly(() => {
      if (!hadFocus) return;
      this.view.focus();
    })();
  }

  public override ignoreEvent(): boolean {
    return !!this.embeddedWidget.ignoreEvent;
  }
}
