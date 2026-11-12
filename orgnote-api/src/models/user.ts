import { ModelsUserPersonalInfo } from 'src/remote-api';

export interface PublicUser {
  id?: string;
  name?: string;
  nickName?: string;
  avatarUrl?: string;
  email?: string;
  profileUrl?: string;
}

export type User = PublicUser;

export type PersonalInfo = ModelsUserPersonalInfo;
