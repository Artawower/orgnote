export interface BackgroundSettings {
  setStatusBarBackground: (bgColor?: string) => Promise<void>;
  setBottomBarBackground: (bgColor?: string) => Promise<void>;
  setBackground: (bgColor?: string) => Promise<void>;
}

export type UseBackgroundSettings = () => BackgroundSettings;
