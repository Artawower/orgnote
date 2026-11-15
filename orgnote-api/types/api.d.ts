import { Command, CSSVariable, ThemeVariable, Note } from './models';
import type { NavigationFailure } from 'vue-router';
export interface OrgNoteApi {
    [key: string]: unknown;
    getExtension?<T>(config: string): T;
    system: {
        reload: (params?: {
            verbose: boolean;
        }) => Promise<void>;
    };
    navigation: {
        openNote: (id: string) => Promise<void | NavigationFailure>;
        editNote: (id: string) => Promise<void | NavigationFailure>;
    };
    ui: {
        applyTheme: (theme: {
            [key in ThemeVariable]: string | number;
        }) => void;
        applyCssVariables: (styles: {
            [key in CSSVariable]: string | number;
        }) => void;
        setThemeByMode: (themeName?: string) => void;
        setDarkTheme: (themeName?: string) => void;
        setLightTheme: (themeName?: string) => void;
        applyStyles: (scopeName: string, styles: string) => void;
        removeStyles: (scopeName: string) => void;
        resetTheme: () => void;
    };
    interaction: {
        confirm: (title: string, message: string) => Promise<boolean>;
    };
    currentNote: {
        get: () => Note;
    };
    editor: {
        widgets: {
            add: () => void;
        };
    };
    commands: {
        add(...commands: Command[]): void;
    };
    configuration: () => OrgNoteConfig;
}
export interface OrgNoteConfig {
    editor: {
        showSpecialSymbols: boolean;
        showPropertyDrawer: boolean;
    };
    common: {
        developerMode: boolean;
        maximumLogsCount: number;
    };
    completion: {
        showGroup: boolean;
        defaultCompletionLimit: number;
    };
    ui: {
        theme: 'light' | 'dark';
        darkThemeName?: string;
        lightThemeName?: string;
    };
    extensions: {
        sources: string[];
    };
}
