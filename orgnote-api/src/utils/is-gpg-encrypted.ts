const PGP_ARMOR_HEADER = '-----BEGIN PGP';

export function isArmoredPgp(content: string | Uint8Array): boolean {
  if (typeof content === 'string') {
    return content.startsWith(PGP_ARMOR_HEADER);
  }
  const header = String.fromCharCode(...content.slice(0, PGP_ARMOR_HEADER.length));
  return header === PGP_ARMOR_HEADER;
}

export function isGpgEncrypted(text: string | Uint8Array): boolean {
  if (text instanceof Uint8Array) {
    return true;
  }
  return text.startsWith('-----BEGIN PGP MESSAGE-----');
}
