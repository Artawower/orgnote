import {
  defineStore,
  getActivePinia,
  type DefineSetupStoreOptions,
  type Pinia,
  type StoreDefinition,
  type _ExtractActionsFromSetupStore,
  type _ExtractGettersFromSetupStore,
  type _ExtractStateFromSetupStore,
} from 'pinia';

export interface StorageBoundParticipant {
  $resetStorage: () => void | Promise<void>;
}

export type StorageBoundStoreFactory = (
  pinia?: Pinia | null,
) => StorageBoundParticipant;

const storageBoundRegistry = new Map<string, StorageBoundStoreFactory>();

export function defineStorageBoundStore<
  Id extends string,
  PublicStore extends object,
>(
  id: Id,
  storeSetup: () => NoInfer<PublicStore> & StorageBoundParticipant,
  options?: DefineSetupStoreOptions<
    Id,
    _ExtractStateFromSetupStore<PublicStore>,
    _ExtractGettersFromSetupStore<PublicStore>,
    _ExtractActionsFromSetupStore<PublicStore>
  >,
): StoreDefinition<
  Id,
  _ExtractStateFromSetupStore<PublicStore>,
  _ExtractGettersFromSetupStore<PublicStore>,
  _ExtractActionsFromSetupStore<PublicStore>
>;
export function defineStorageBoundStore(
  id: string,
  storeSetup: () => StorageBoundParticipant,
  options?: object,
): object {
  const storeDefinition = defineStore<string, StorageBoundParticipant>(
    id,
    storeSetup,
    options as never,
  );
  storageBoundRegistry.set(id, storeDefinition);
  return storeDefinition;
}

const resetStorageBoundStore = async (
  factory: StorageBoundStoreFactory,
  pinia?: Pinia,
): Promise<void> => {
  await factory(pinia).$resetStorage();
};

export const resetStorageBoundStores = async (pinia?: Pinia): Promise<void> => {
  const targetPinia = pinia ?? getActivePinia();
  const factories = Array.from(storageBoundRegistry.values());
  const results = await Promise.allSettled(
    factories.map((factory) => resetStorageBoundStore(factory, targetPinia)),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) throw failure.reason;
};

export const clearStorageBoundRegistry = (): void => {
  storageBoundRegistry.clear();
};
