import type { PersonalInfo } from 'orgnote-api';

export const extractAuthQueryInfo = (query: Record<string, string>): PersonalInfo => ({
  avatarUrl: query.avatarUrl,
  email: query.email,
  nickName: query.username,
  profileUrl: query.profileUrl,
  // provider: query.provider,
  id: query.id,
  spaceLimit: query.spaceLimit ? +query.spaceLimit : undefined,
  usedSpace: query.usedSpace ? +query.usedSpace : undefined,
  active: query.active,
});
