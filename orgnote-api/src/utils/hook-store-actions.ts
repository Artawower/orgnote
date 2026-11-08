import type { StoreActions, StoreGeneric } from 'pinia';

type StoreActionName<TStore extends StoreGeneric> = Extract<
  keyof StoreActions<TStore>,
  string
>;

type StoreActionMethod<
  TStore extends StoreGeneric,
  TName extends StoreActionName<TStore>
> = StoreActions<TStore>[TName];

type StoreActionArguments<TAction> = TAction extends (
  ...args: infer TArguments
) => unknown
  ? TArguments
  : never;

type StoreActionResult<TAction> = TAction extends (
  ...args: infer _TArguments
) => infer TResult
  ? Awaited<TResult>
  : never;

type StoreActionContext<TName extends string, TAction> = {
  readonly name: TName;
  readonly args: StoreActionArguments<TAction>;
};

type StoreActionAfterContext<TName extends string, TAction> =
  StoreActionContext<TName, TAction> & {
    readonly result: StoreActionResult<TAction>;
  };

type StoreActionErrorContext<TName extends string, TAction> =
  StoreActionContext<TName, TAction> & {
    readonly error: unknown;
  };

export type StoreActionHooks<TStore extends StoreGeneric> = {
  readonly [TName in StoreActionName<TStore>]?: {
    readonly before?: (
      context: StoreActionContext<TName, StoreActionMethod<TStore, TName>>
    ) => void;
    readonly after?: (
      context: StoreActionAfterContext<
        TName,
        StoreActionMethod<TStore, TName>
      >
    ) => void;
    readonly error?: (
      context: StoreActionErrorContext<
        TName,
        StoreActionMethod<TStore, TName>
      >
    ) => void;
  };
};

type RuntimeActionContext = {
  readonly name: string;
  readonly args: readonly unknown[];
};

type RuntimeActionHook = {
  readonly before?: (context: RuntimeActionContext) => void;
  readonly after?: (
    context: RuntimeActionContext & { readonly result: unknown }
  ) => void;
  readonly error?: (
    context: RuntimeActionContext & { readonly error: unknown }
  ) => void;
};

const getRuntimeHook = <TStore extends StoreGeneric>(
  hooks: StoreActionHooks<TStore>,
  name: string
): RuntimeActionHook | undefined => {
  if (!Object.hasOwn(hooks, name)) return undefined;
  return (
    hooks as unknown as Readonly<Record<string, RuntimeActionHook | undefined>>
  )[name];
};

/** Registers typed lifecycle hooks for selected Pinia store actions. */
export const hookStoreActions = <TStore extends StoreGeneric>(
  store: TStore,
  hooks: StoreActionHooks<TStore>
): (() => void) =>
  store.$onAction(({ name, args, after, onError }) => {
    const hook = getRuntimeHook(hooks, name);
    if (!hook) return;

    const context = { name, args };
    hook.before?.(context);

    const afterHook = hook.after;
    if (afterHook) after((result) => afterHook({ ...context, result }));

    const errorHook = hook.error;
    if (errorHook) onError((error) => errorHook({ ...context, error }));
  });
