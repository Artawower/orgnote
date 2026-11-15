import { MaybeRefOrGetter } from 'vue';

export declare const DEFAULT_KEYBINDING_GROUP = "default";
export type CommandGroup = 'settings' | 'editor' | 'global' | 'note-detail' | 'completion' | string;
export interface CommandHandlerParams {
    event?: KeyboardEvent;
    data?: unknown;
    [key: string]: unknown;
}
export interface Command {
    keySequence?: string | string[];
    description?: MaybeRefOrGetter<string | undefined>;
    command?: string;
    title?: MaybeRefOrGetter<string | undefined>;
    icon?: MaybeRefOrGetter<string | undefined>;
    group?: CommandGroup;
    allowOnInput?: boolean;
    ignorePrompt?: boolean;
    handler: (params?: CommandHandlerParams) => unknown | Promise<unknown>;
}
