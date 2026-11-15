import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const HIDEABLE_NODES = new Set([
  'HeaderMark',
  'EmphasisMark',
  'LinkMark',
  'CodeMark',
  'URL',
]);

const hideDecoration = Decoration.replace({});

const buildReadonlyDecorations = (view: EditorView): DecorationSet => {
  const decorations: { from: number; to: number }[] = [];

  view.visibleRanges.forEach(({ from, to }) => {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        if (!HIDEABLE_NODES.has(node.name)) return;
        decorations.push({ from: node.from, to: node.to });
      },
    });
  });

  if (decorations.length === 0) return Decoration.none;

  decorations.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  decorations.forEach(({ from, to }) => {
    builder.add(from, to, hideDecoration);
  });
  return builder.finish();
};

export const markdownReadonlyDecorations = () =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildReadonlyDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildReadonlyDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
