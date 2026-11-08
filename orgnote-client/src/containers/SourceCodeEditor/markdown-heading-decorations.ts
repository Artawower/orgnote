import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_NODE_LEVELS: Record<string, HeadingLevel> = {
  ATXHeading1: 1,
  ATXHeading2: 2,
  ATXHeading3: 3,
  ATXHeading4: 4,
  ATXHeading5: 5,
  ATXHeading6: 6,
  SetextHeading1: 1,
  SetextHeading2: 2,
};

const toHeadingLevel = (nodeName: string): HeadingLevel | undefined =>
  HEADING_NODE_LEVELS[nodeName];

const buildHeadingDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const decorations: { pos: number; deco: Decoration }[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        const level = toHeadingLevel(node.name);
        if (!level) return;

        const line = view.state.doc.lineAt(node.from);
        decorations.push({
          pos: line.from,
          deco: Decoration.line({ class: `markdown-heading-line markdown-heading-${level}` }),
        });
      },
    });
  }

  decorations.sort((a, b) => a.pos - b.pos);

  decorations.forEach(({ pos, deco }) => { builder.add(pos, pos, deco); });

  return builder.finish();
};

export const markdownHeadingDecorations = () =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildHeadingDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildHeadingDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
