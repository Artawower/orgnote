import { boolean, metadata } from 'valibot';
import {
  object,
  string,
  union,
  optional,
  literal,
  InferOutput,
  intersect,
  pipe,
} from 'valibot';
import { DefaultCommands } from './default-commands.js';

export const EncryptionType = {
  GpgKeys: 'gpgKeys',
  GpgPassword: 'gpgPassword',
  Disabled: 'disabled',
} as const;

export type EncryptionType =
  (typeof EncryptionType)[keyof typeof EncryptionType];

export type EcnryptionFormat = 'binary' | 'armored';

export interface BaseOrgNoteEncryption {
  format?: 'binary' | 'armored';
}

export interface BaseOrgNoteDecryption {
  format?: 'utf8' | 'binary';
}

const OrgNoteGpgEncryptionSchema = object({
  type: literal(EncryptionType.GpgKeys),
  privateKey: pipe(
    string(),
    metadata({
      textarea: true,
      upload: true,
      command: DefaultCommands.UPLOAD_PRIVATE_KEY,
    })
  ),
  publicKey: pipe(
    optional(string()),
    metadata({
      textarea: true,
      upload: true,
      command: DefaultCommands.UPLOAD_PUBLIC_KEY,
    })
  ),
  privateKeyPassphrase: pipe(optional(string()), metadata({ password: true })),
});

const OrgNotePasswordEncryptionSchema = object({
  type: literal(EncryptionType.GpgPassword),
  password: pipe(string(), metadata({ password: true })),
});

const OrgNoteDisabledEncryptionSchema = object({
  type: literal(EncryptionType.Disabled),
});

export const OrgNoteEncryptionSchema = intersect([
  object({ encryptFilesByDefault: optional(boolean()) }),
  pipe(
    union([
      OrgNoteGpgEncryptionSchema,
      OrgNotePasswordEncryptionSchema,
      OrgNoteDisabledEncryptionSchema,
    ]),
    metadata({ conditionalKey: 'type' })
  ),
]);

export type OrgNoteGpgEncryption = InferOutput<
  typeof OrgNoteGpgEncryptionSchema
>;
export type OrgNotePasswordEncryption = InferOutput<
  typeof OrgNotePasswordEncryptionSchema
>;
export type OrgNoteEncryption = InferOutput<typeof OrgNoteEncryptionSchema>;

export type EncryptionData = {
  content: string;
};

export type WithEncryptionContent<
  T extends OrgNoteEncryption = OrgNoteEncryption,
> = T & EncryptionData & BaseOrgNoteEncryption;

export type DecriptionData = {
  content: string | Uint8Array;
};

export type WithDecryptionContent<
  T extends OrgNoteEncryption = OrgNoteEncryption,
> = T & DecriptionData & BaseOrgNoteDecryption;

export type WithNoteDecryptionContent<
  T extends OrgNoteEncryption = OrgNoteEncryption,
> = T & DecriptionData;
