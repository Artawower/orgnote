import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const linkDecoration = Decoration.mark({ class: 'markdown-link' });

const buildLinkDecorations = (view: EditorView): DecorationSet => {
  const decorations: { from: number; to: number }[] = [];

  view.visibleRanges.forEach(({ from, to }) => {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        if (node.name !== 'Link') return;
        decorations.push({ from: node.from, to: node.to });
      },
    });
  });

  if (decorations.length === 0) return Decoration.none;

  decorations.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  decorations.forEach(({ from, to }) => {
    builder.add(from, to, linkDecoration);
  });
  return builder.finish();
};

export const markdownLinkDecorations = () =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildLinkDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildLinkDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
