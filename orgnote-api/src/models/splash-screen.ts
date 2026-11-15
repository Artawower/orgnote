export interface SplashScreenGroupConfig {
  group?: string;
}

export interface SplashScreenConfig extends SplashScreenGroupConfig {
  randomPreparationText?: boolean;
  preparationText?: string;
  randomPreparationTexts?: boolean;
}

export interface SplashScreen {
  show(config?: SplashScreenConfig): void;
  hide(config?: SplashScreenGroupConfig): void;
}

export type UseSplashScreen = () => SplashScreen;
