export interface CapabilityUser {
  active?: unknown;
  isAnonymous?: boolean;
}

export const canUseRemoteAccountFeatures = (
  user: CapabilityUser | null | undefined,
  isSelfHosted: boolean,
): boolean => Boolean(user && !user.isAnonymous && (user.active || isSelfHosted));
