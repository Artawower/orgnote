const isDevDeployment = (): boolean =>
  process.env.DEV || process.env.DEPLOYMENT_ENV === 'dev' || process.env.DEPLOYMENT_ENV === 'local';

export const CLI_STABLE_INSTALL_COMMAND = 'npm install -g orgnote-cli';
export const CLI_DEV_INSTALL_COMMAND = 'npm install -g orgnote-cli@dev';

export const getCliInstallInstructions = (): string =>
  isDevDeployment() ? CLI_DEV_INSTALL_COMMAND : CLI_STABLE_INSTALL_COMMAND;
