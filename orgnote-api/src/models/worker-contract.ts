import type { OrgNoteCoreApi } from '../api';

export interface WorkerProcedure<TInput, TOutput> {
  readonly input: TInput;
  readonly output: TOutput;
}

export interface OrgNoteWorkerContract {
  readonly methods: object;
  readonly events: object;
}

export type WorkerMethodName<TContract extends OrgNoteWorkerContract> = Extract<
  keyof TContract['methods'],
  string
>;

export type WorkerEventName<TContract extends OrgNoteWorkerContract> = Extract<
  keyof TContract['events'],
  string
>;

export type WorkerInput<
  TContract extends OrgNoteWorkerContract,
  TMethod extends WorkerMethodName<TContract>,
> = TContract['methods'][TMethod] extends WorkerProcedure<
  infer TInput,
  unknown
>
  ? TInput
  : never;

export type WorkerOutput<
  TContract extends OrgNoteWorkerContract,
  TMethod extends WorkerMethodName<TContract>,
> = TContract['methods'][TMethod] extends WorkerProcedure<
  unknown,
  infer TOutput
>
  ? TOutput
  : never;

export interface WorkerCallOptions {
  readonly signal?: AbortSignal;
  readonly transfer?: readonly Transferable[];
}

export interface OrgNoteWorkerHandle<
  TContract extends OrgNoteWorkerContract,
> {
  call<TMethod extends WorkerMethodName<TContract>>(
    method: TMethod,
    input: WorkerInput<TContract, TMethod>,
    options?: WorkerCallOptions
  ): Promise<WorkerOutput<TContract, TMethod>>;

  on<TEvent extends WorkerEventName<TContract>>(
    event: TEvent,
    listener: (payload: TContract['events'][TEvent]) => void
  ): () => void;

  dispose(): void;
}

export interface WorkerMethodContext<
  TContract extends OrgNoteWorkerContract,
> {
  readonly api: OrgNoteCoreApi;
  readonly signal: AbortSignal;

  emit<TEvent extends WorkerEventName<TContract>>(
    event: TEvent,
    payload: TContract['events'][TEvent]
  ): void;
}

export type OrgNoteWorkerHandlers<TContract extends OrgNoteWorkerContract> = {
  readonly [TMethod in WorkerMethodName<TContract>]: (
    input: WorkerInput<TContract, TMethod>,
    context: WorkerMethodContext<TContract>
  ) =>
    | WorkerOutput<TContract, TMethod>
    | Promise<WorkerOutput<TContract, TMethod>>;
};

export interface OrgNoteWorkerDefinition<
  TContract extends OrgNoteWorkerContract,
> {
  readonly methods: OrgNoteWorkerHandlers<TContract>;
}
