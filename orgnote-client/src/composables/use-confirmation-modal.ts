import type { ConfirmationModal } from 'orgnote-api';
import { api } from 'src/boot/api';
import ConfirmationModalCmp from 'src/components/ConfirmationModal.vue';
import { createPromise } from 'src/utils/create-promise';

export function useConfirmationModal(): ConfirmationModal {
  let resolveConfirmation: (data?: boolean) => void = () => {};

  const modal = api.ui.useModal();

  const confirm = async (params = {}) => {
    const [promise, resolver] = createPromise<boolean>();
    resolveConfirmation = (data?: boolean) => resolver(data ?? false);
    modal.open(ConfirmationModalCmp, {
      mini: true,
      modalProps: {
        resolver,
        ...params,
      },
    });
    const res = await promise.finally(() => resetModal());
    modal.close();
    return res;
  };

  const resetModal = () => {
    resolveConfirmation = () => {};
  };

  return {
    confirm,
    resolveConfirmation,
  };
}
