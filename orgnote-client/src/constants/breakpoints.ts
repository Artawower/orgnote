export const TABLET_BREAKPOINT = 768;
export const DESKTOP_BREAKPOINT = 1024;

export const BREAKPOINTS = {
  mobile: undefined,
  tablet: TABLET_BREAKPOINT,
  desktop: DESKTOP_BREAKPOINT,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export type ResponsiveBreakpoint = Exclude<BreakpointKey, 'mobile'>;

export const RESPONSIVE_BREAKPOINTS: readonly ResponsiveBreakpoint[] = [
  'tablet',
  'desktop',
] as const;
