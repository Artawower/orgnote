import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { NodeType, type OrgNode } from 'org-mode-ast';
import type { InlineEmbeddedWidget, WidgetBuilderParams } from 'orgnote-api';
import { OrgInlineWidget } from './org-inline-widget';

const CHECKBOX_LENGTH = 3;

const createOrgNode = (start: number, end: number, rawValue = '[ ]'): OrgNode =>
  ({
    start,
    end,
    rawValue,
    type: NodeType.Checkbox,
    parent: { type: NodeType.Section },
    children: [],
  }) as unknown as OrgNode;

const createInlineWidget = (
  onMount?: (params: WidgetBuilderParams) => void,
): InlineEmbeddedWidget =>
  ({
    id: 'inline-checkbox',
    decorationType: 'replace',
    widgetBuilder: (params) => {
      onMount?.(params);
      return { destroy: () => {} };
    },
  }) as InlineEmbeddedWidget;

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

const createEditorView = (doc: string): EditorView =>
  new EditorView({
    state: EditorState.create({ doc }),
    parent: container,
  });

test('OrgInlineWidget updates position from posAtDOM when dispatch is triggered', () => {
  const doc = [
    '- [X] Navigation arrows',
    '- [ ] Ability to configure extensions via ZOD scheme',
    '- [ ] orgnote api components scheme for seamless changing via extensions',
  ].join('\n');
  const secondCheckboxStart = doc.indexOf('[ ] Ability');
  const thirdCheckboxStart = doc.lastIndexOf('[ ]');
  const thirdCheckbox = createOrgNode(thirdCheckboxStart, thirdCheckboxStart + CHECKBOX_LENGTH);
  const view = createEditorView(doc);
  vi.spyOn(view, 'posAtDOM').mockReturnValue(secondCheckboxStart);
  let onUpdate: ((newValue: string) => void) | undefined;
  const inlineWidget = createInlineWidget((params) => {
    onUpdate = params.onUpdateFn;
  });
  const widget = new OrgInlineWidget(view, thirdCheckbox, inlineWidget, () => null, false);

  widget.toDOM();
  onUpdate?.('[X]');

  expect(view.state.doc.toString()).toBe(
    [
      '- [X] Navigation arrows',
      '- [X] Ability to configure extensions via ZOD scheme',
      '- [ ] orgnote api components scheme for seamless changing via extensions',
    ].join('\n'),
  );

  view.destroy();
});

test('OrgInlineWidget eq keeps widgets equal when checkbox text shifts to another range', () => {
  const doc = [
    '- [X] Navigation arrows',
    '- [ ] Ability to configure extensions via ZOD scheme',
    '- [ ] orgnote api components scheme for seamless changing via extensions',
  ].join('\n');
  const secondCheckboxStart = doc.indexOf('[ ] Ability');
  const thirdCheckboxStart = doc.lastIndexOf('[ ]');
  const inlineWidget = createInlineWidget();
  const view = createEditorView(doc);
  const second = new OrgInlineWidget(
    view,
    createOrgNode(secondCheckboxStart, secondCheckboxStart + CHECKBOX_LENGTH),
    inlineWidget,
    () => null,
    false,
  );
  const third = new OrgInlineWidget(
    view,
    createOrgNode(thirdCheckboxStart, thirdCheckboxStart + CHECKBOX_LENGTH),
    inlineWidget,
    () => null,
    false,
  );

  expect(second.eq(third)).toBe(true);

  view.destroy();
});

test('OrgInlineWidget eq returns false for widgets with different rawValue', () => {
  const doc = '- [ ] First\n- [X] Second';
  const uncheckedStart = doc.indexOf('[ ]');
  const checkedStart = doc.indexOf('[X]');
  const view = createEditorView(doc);
  const inlineWidget = createInlineWidget();
  const unchecked = new OrgInlineWidget(
    view,
    createOrgNode(uncheckedStart, uncheckedStart + CHECKBOX_LENGTH, '[ ]'),
    inlineWidget,
    () => null,
    false,
  );
  const checked = new OrgInlineWidget(
    view,
    createOrgNode(checkedStart, checkedStart + CHECKBOX_LENGTH, '[X]'),
    inlineWidget,
    () => null,
    false,
  );

  expect(unchecked.eq(checked)).toBe(false);

  view.destroy();
});

test('OrgInlineWidget skips dispatch when posAtDOM points to mismatched text', () => {
  const doc = '- [ ] Only checkbox';
  const checkboxStart = doc.indexOf('[ ]');
  const orgNode = createOrgNode(checkboxStart, checkboxStart + CHECKBOX_LENGTH);
  const view = createEditorView(doc);
  vi.spyOn(view, 'posAtDOM').mockReturnValue(0);
  let onUpdate: ((newValue: string) => void) | undefined;
  const inlineWidget = createInlineWidget((params) => {
    onUpdate = params.onUpdateFn;
  });
  const widget = new OrgInlineWidget(view, orgNode, inlineWidget, () => null, false);

  widget.toDOM();
  onUpdate?.('[X]');

  expect(view.state.doc.toString()).toBe(doc);

  view.destroy();
});

test('OrgInlineWidget falls back to orgNode position after destroy', () => {
  const doc = '- [ ] Only checkbox';
  const checkboxStart = doc.indexOf('[ ]');
  const orgNode = createOrgNode(checkboxStart, checkboxStart + CHECKBOX_LENGTH);
  const view = createEditorView(doc);
  let onUpdate: ((newValue: string) => void) | undefined;
  const inlineWidget = createInlineWidget((params) => {
    onUpdate = params.onUpdateFn;
  });
  const widget = new OrgInlineWidget(view, orgNode, inlineWidget, () => null, false);

  widget.toDOM();
  widget.destroy();
  onUpdate?.('[X]');

  expect(view.state.doc.toString()).toBe('- [X] Only checkbox');

  view.destroy();
});

test('OrgInlineWidget destroy calls embedded widget destroy', () => {
  const doc = '- [ ] Task';
  const checkboxStart = doc.indexOf('[ ]');
  const orgNode = createOrgNode(checkboxStart, checkboxStart + CHECKBOX_LENGTH);
  const view = createEditorView(doc);
  const destroySpy = vi.fn();
  const inlineWidget = createInlineWidget();
  inlineWidget.widgetBuilder = () => ({ destroy: destroySpy });
  const widget = new OrgInlineWidget(view, orgNode, inlineWidget, () => null, false);

  widget.toDOM();
  widget.destroy();

  expect(destroySpy).toHaveBeenCalledOnce();

  view.destroy();
});
