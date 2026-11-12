const withBaseInstrutcions = (
  ensure?: string,
) => `(use-package orgnote ${ensure ? '\n' + ensure : ''}
  :bind
  (("C-c n p" . orgnote-publish-file)
   ("C-c n F" . orgnote-force-sync)
   ("C-c n S" . orgnote-sync))
  :hook (org-mode . orgnote-autosync-mode)
  :custom
  (orgnote-debug-p t))`;

export const USE_PACKAGE_DEV_ENSTRUCTIONS = withBaseInstrutcions(
  '  :ensure (:host github :repo "Artawower/orgnote.el" :branch "dev")',
);

export const USE_PACKAGE_MASTER_ENSTRUCTIONS = withBaseInstrutcions();

const isDevDeployment = (): boolean =>
  process.env.DEV || process.env.DEPLOYMENT_ENV === 'dev' || process.env.DEPLOYMENT_ENV === 'local';

export const getUsePackageInstructions = (): string =>
  isDevDeployment() ? USE_PACKAGE_DEV_ENSTRUCTIONS : USE_PACKAGE_MASTER_ENSTRUCTIONS;
