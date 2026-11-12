import { h, type Component } from 'vue';
import type {
  WidgetBuilder,
  WidgetBuilderParams,
  EmbeddedWidget,
  MultilineEmbeddedWidget,
} from 'orgnote-api';
import { useDynamicComponent } from 'src/utils/dynamic-component';
import { toKebabCase } from 'src/utils/to-kebab-case';
import MultilineWidgetWrapper from 'src/containers/RichEditor/widgets/MultilineWidgetWrapper.vue';

export const useWidgetBuilder = () => {
  const dynamicComponent = useDynamicComponent();

  const createWidgetBuilder = (
    cmp: Component,
    props: Record<string, unknown> = {},
  ): WidgetBuilder => {
    return (params: WidgetBuilderParams): EmbeddedWidget => {
      const normalizedType = toKebabCase(params.orgNode.type);
      params.wrap.classList.add(`org-embedded-${normalizedType}`);

      return dynamicComponent.mount(cmp, params.wrap, {
        ...props,
        node: params.orgNode,
        editorView: params.editorView,
        rootNodeSrc: params.rootNodeSrc,
        readonly: params.readonly,
        onUpdate: (newVal: string) => params.onUpdateFn?.(newVal),
      });
    };
  };

  const createMultilineWidgetBuilder = (
    cmp: Component,
    widget: MultilineEmbeddedWidget,
  ): WidgetBuilder => {
    return (params: WidgetBuilderParams): EmbeddedWidget => {
      const normalizedType = toKebabCase(params.orgNode.type);
      const componentProps = widget.componentProps ?? {};
      const actionsComponent = widget.actionsComponent;
      const actionsComponentProps = widget.actionsComponentProps ?? {};
      params.wrap.classList.add(`org-embedded-${normalizedType}`);
      params.wrap.classList.add('org-embedded-multiline');

      const widgetRuntimeProps = {
        node: params.orgNode,
        nodeGetter: params.orgNodeGetter,
        editorView: params.editorView,
        rootNodeSrc: params.rootNodeSrc,
        readonly: params.readonly,
        onUpdate: (newVal: string) => params.onUpdateFn?.(newVal),
      };

      const wrappedComponent = h(
        MultilineWidgetWrapper,
        {
          readonly: params.readonly,
          suppressEdit: params.suppressEdit,
          showEditAction: widget.showEditAction,
          onEdit: () => params.onEditMode?.(),
        },
        {
          default: () => h(cmp, { ...componentProps, ...widgetRuntimeProps }),
          actions: actionsComponent
            ? () => h(actionsComponent, { ...actionsComponentProps, ...widgetRuntimeProps })
            : undefined,
        },
      );

      return dynamicComponent.mount(wrappedComponent, params.wrap);
    };
  };

  return {
    createWidgetBuilder,
    createMultilineWidgetBuilder,
  };
};
