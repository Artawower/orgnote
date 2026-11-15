export interface ConfirmationModalParams {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmationModal {
  confirm: (params?: ConfirmationModalParams) => Promise<boolean>;
  resolveConfirmation: (data?: boolean) => void;
}

export type UseConfirmationModal = () => ConfirmationModal;
