import {
  createMessage,
  decrypt as _decrypt,
  decryptKey,
  encrypt as _encrypt,
  generateKey,
  readKey,
  readMessage,
  readPrivateKey,
  Stream,
} from 'openpgp';
import {
  EncryptionType,
  OrgNoteEncryption,
  OrgNotePasswordEncryption,
  WithDecryptionContent,
} from '../models/encryption';
import { OrgNoteGpgEncryption, WithEncryptionContent } from '../models';
import { armor as _armor, unarmor as _unarmor, enums } from 'openpgp';

export class IncorrectOrMissingPrivateKeyPasswordError extends Error {
  constructor(message?: string) {
    super(message ?? 'Private key passphrase is missing or incorrect. Please check your encryption settings.');
    this.name = 'IncorrectOrMissingPrivateKeyPasswordError';
  }
}

export class ImpossibleToDecryptWithProvidedKeysError extends Error {
  constructor(message?: string) {
    super(message ?? 'Decryption failed. The provided keys cannot decrypt this file.');
    this.name = 'ImpossibleToDecryptWithProvidedKeysError';
  }
}

export class IncorrectEncryptionPasswordError extends Error {
  constructor(message?: string) {
    super(message ?? 'Incorrect encryption password.');
    this.name = 'IncorrectEncryptionPasswordError';
  }
}

export class NoKeysProvidedError extends Error {
  constructor(message?: string) {
    super(message ?? 'No encryption keys provided. Please configure keys in Settings → Encryption.');
    this.name = 'NoKeysProvidedError';
  }
}

export class NoPasswordProvidedError extends Error {
  constructor(message?: string) {
    super(message ?? 'No encryption password provided. Please configure password in Settings → Encryption.');
    this.name = 'NoPasswordProvidedError';
  }
}

const PRIVATE_KEY_NOT_DECRYPTED_PATTERNS = [
  'Signing key is not decrypted',
  'Incorrect key passphrase',
  'Misformed armored text',
  'Decryption key is not decrypted',
  'Armored text not of type private key',
];

const DECRYPTION_FAILED_PATTERN = 'Session key decryption failed';
const INCORRECT_PASSWORD_PATTERN = 'Modification detected';
const NO_SYMMETRIC_KEY_PATTERN = 'No symmetrically encrypted session key packet found';
const NO_PUBLIC_KEY_PATTERN = 'No public key encrypted session key packet found';

export const encryptViaKeys = withCustomErrors(_encryptViaKeys);
export const encryptViaPassword = withCustomErrors(_encryptViaPassword);
export const decryptViaPassword = withCustomErrors(_decryptViaPassword);
export const decryptViaKeys = withCustomErrors(_decryptViaKeys);

export interface GenerateGpgKeysParams {
  username: string;
  email: string;
  passphrase?: string;
}

export interface GeneratedGpgKeys {
  privateKey: string;
  publicKey: string;
}

export const generateGpgKeys = async (
  params: GenerateGpgKeysParams
): Promise<GeneratedGpgKeys> => {
  const { privateKey, publicKey } = await generateKey({
    type: 'curve25519',
    userIDs: [{ name: params.username, email: params.email }],
    passphrase: params.passphrase,
    format: 'armored',
  });

  return {
    privateKey,
    publicKey,
  };
};

export const encrypt = async <
  T extends WithEncryptionContent<OrgNoteEncryption>,
>(
  encryptionParams: T
): Promise<T['format'] extends 'binary' ? Uint8Array : string> => {
  if (
    !encryptionParams.type ||
    encryptionParams.type === EncryptionType.Disabled
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return encryptionParams.content as any;
  }

  const res = (encryptionParams.type ===
  EncryptionType.GpgKeys
    ? await encryptViaKeys(encryptionParams)
    : await encryptViaPassword(encryptionParams)) as unknown as Promise<
    T['format'] extends 'binary' ? Uint8Array : string
  >;

  return res;
};

export const decrypt = async <
  T extends WithDecryptionContent<OrgNoteEncryption>,
>(
  decryptionParams: T
): Promise<T['format'] extends 'binary' ? Uint8Array : string> => {
  if (
    !decryptionParams.type ||
    decryptionParams.type === EncryptionType.Disabled
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return decryptionParams.content as any;
  }
  const decryptedNote = (decryptionParams.type ===
  EncryptionType.GpgKeys
    ? await decryptViaKeys(decryptionParams)
    : await decryptViaPassword(decryptionParams)) as unknown as Promise<
    T['format'] extends 'binary' ? Uint8Array : string
  >;

  return decryptedNote;
};

async function _encryptViaPassword<
  T extends WithEncryptionContent<OrgNotePasswordEncryption>,
>({
  content,
  password,
  format = 'binary',
}: T): Promise<T['format'] extends 'binary' ? Uint8Array : string> {
  const message = await createMessage({
    text: content,
  });

  const encryptedMessage = await _encrypt({
    message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    format: format as any,
    passwords: [password],
  });

  return encryptedMessage as Promise<
    T['format'] extends 'binary' ? Uint8Array : string
  >;
}

export async function _encryptViaKeys<
  T extends WithEncryptionContent<OrgNoteGpgEncryption>,
>({
  content,
  publicKey: armoredPublicKey,
  privateKey: armoredPrivateKey,
  privateKeyPassphrase,
  format = 'binary',
}: T): Promise<T['format'] extends 'binary' ? Uint8Array : string> {
  const publicKey = await readKey({ armoredKey: armoredPublicKey });

  const message = await createMessage({
    text: content,
  });

  const encryptedPrivateKey = await readPrivateKey({
    armoredKey: armoredPrivateKey,
  });

  const privateKey = privateKeyPassphrase
    ? await decryptKey({
        privateKey: encryptedPrivateKey,
        passphrase: privateKeyPassphrase,
      })
    : encryptedPrivateKey;

  const encryptedMessage = await _encrypt({
    message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    format: format as any,
    encryptionKeys: publicKey,
    signingKeys: privateKey,
  });

  return encryptedMessage as Promise<
    T['format'] extends 'binary' ? Uint8Array : string
  >;
}

async function _decryptViaPassword<
  T extends Omit<WithDecryptionContent<OrgNotePasswordEncryption>, 'type'>,
>({
  content,
  password,
  format = 'utf8',
}: T): Promise<T['format'] extends 'binary' ? Uint8Array : string> {
  const isArmoredContent = typeof content === 'string';

  const message = await (isArmoredContent
    ? readMessage({ armoredMessage: content })
    : readMessage({ binaryMessage: content }));

  const { data: decryptedText } = await _decrypt({
    message,
    format,
    passwords: password,
  });

  return decryptedText as Promise<
    T['format'] extends 'binary' ? Uint8Array : string
  >;
}

// TODO: master OrgNoteGpgDecryption type
async function _decryptViaKeys<
  T extends Omit<WithDecryptionContent<OrgNoteGpgEncryption>, 'type'>,
>({
  privateKey: armoredPrivateKey,
  privateKeyPassphrase,
  content,
  format = 'utf8',
}: T): Promise<T['format'] extends 'binary' ? Uint8Array : string> {
  const encryptedPrivateKey = await readPrivateKey({
    armoredKey: armoredPrivateKey,
  });

  const privateKey = privateKeyPassphrase
    ? await decryptKey({
        privateKey: encryptedPrivateKey,
        passphrase: privateKeyPassphrase,
      })
    : encryptedPrivateKey;

  const isString = typeof content === 'string';
  const message = await (isString
    ? readMessage({ armoredMessage: content })
    : readMessage({ binaryMessage: content }));

  const { data: decryptedText } = await _decrypt({
    message,
    format,
    decryptionKeys: privateKey,
  });

  return decryptedText as Promise<
    T['format'] extends 'binary' ? Uint8Array : string
  >;
}

const messageContains = (message: string, pattern: string): boolean =>
  message.includes(pattern);

function withCustomErrors<P extends unknown[], T>(
  fn: (...args: P) => Promise<T | never>
) {
  return async (...args: P): Promise<T> => {
    try {
      return await fn(...args);
    } catch (e: unknown) {
      if (!(e instanceof Error)) {
        throw e;
      }
      const msg = e.message;

      if (PRIVATE_KEY_NOT_DECRYPTED_PATTERNS.some((p) => messageContains(msg, p))) {
        throw new IncorrectOrMissingPrivateKeyPasswordError();
      }
      if (messageContains(msg, DECRYPTION_FAILED_PATTERN)) {
        throw new ImpossibleToDecryptWithProvidedKeysError();
      }
      if (messageContains(msg, INCORRECT_PASSWORD_PATTERN)) {
        throw new IncorrectEncryptionPasswordError();
      }
      if (messageContains(msg, NO_SYMMETRIC_KEY_PATTERN)) {
        throw new NoKeysProvidedError();
      }
      if (messageContains(msg, NO_PUBLIC_KEY_PATTERN)) {
        throw new NoPasswordProvidedError();
      }

      throw e;
    }
  };
}

// TODO: feat/native-encryption-support add custom error handling
export function armor(data: Uint8Array): string {
  return _armor(enums.armor.message, data);
}

export async function unarmor(
  data: string
): Promise<{ text: string; data: Stream<Uint8Array>; type: enums.armor }> {
  return await _unarmor(data);
}
