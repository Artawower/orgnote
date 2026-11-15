const ORGNOTE_CONFIG_PATH_PATTERN = /(?:^|\/)\.orgnote\/config\.toml$/;

export const isOrgNoteConfigPath = (path: string): boolean =>
  ORGNOTE_CONFIG_PATH_PATTERN.test(path);
