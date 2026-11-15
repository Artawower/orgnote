import { expect, test } from 'vitest';
import { isArmoredPgp, isGpgEncrypted } from '../is-gpg-encrypted';

test('Should return true if the content is gpg encrypted', () => {
  const content = `-----BEGIN PGP MESSAGE-----

wcFMA/vryg+TTn0rAQ//TBFRjKmjRQoLhSrgeH+NbsZXbxvo7Ey4k+BQ9XA5
+CMpXH9uFUxsSaI5+McUSEt32VI17HRpXQDCL9nwaWqWOanMaRe0tXXhtox2
gfe2f/6zsge9ux+mXF2BG4z+V5T8XIOrfzxosVprdJHZHM3x7cW5USQ0t2i2
FiOUWxSZO1899J3yICpMvhDXvTLVZuKpSNQho5PyXSeZa83eN+uYkhgt9lsk
0KW88Nr435S6n6mVw/zpitXIgEKpkqh46mhG+1W3aC0lYx6j9lHm3bjtdb4r
2mtZbWKwfdBggEy8qEeiUeslvKd6uWtEccomzFgJkaqWVGknLmrBdHfztRIV
fbZhxHz+J3GFOIgXf/5+fv+zg0nTazgz1mDUfnTHw3+qcAyEJ0ADdyg9EZc+
bKbK0GwzMDPQeM+cCRDWUTiIa1ruyEETiwMdhWUDztF8XxY2o8jXPerZ0NhG
R8l+SvAdYQQXPfxEh9lA3thkyz/Vp72pW46lUeJHGSq/fS6KIdLHLP9Z2e1J
aCFpNMgyAN+BaXwnbLZfz6k5hV8awbRScSWQLEg69D9b287SFDPOYW7OZikn
CKXL7xyQ5LrWJZN9Z/UPGjy+PdEw1SBhyluW6DQ+Sz1j4K8USTLqY89EInDl
G7AxHGujR9UkUGyUvvc71XW7jEOogiDgn1ZMoj9Y58LSweUB8vfkY3VF84Fy
zGVvLFWnFbtnWuoQC4OOXv1F6ETdmEsSMEMWKzRLDGPyqNX7FhG3cejlEuiK
EsT5oQhz00RECmnR8mJkGmJhzWmmeoQvaucFqhTOZjvYl9ivuEMBZ2jtkdHn
R6UNcNZRpCbfnl7YoikqbGBgqDFYydFGHXKHDpYhcQYWJsMDUayzUiPtzmaE
tgfTgNNqgPxkLnWA99KYNU8DH+FwgaYBuw9dwdqwcjxSbZjHhCFGUfsqM+ik
O9gcoAwVO1usODlESU7OWuSF2tIv5DBG5rhlSyxBp4d4aWmaumTswAdojy2O
sM70ETbg0mC8niW9lNsgJp55oFmlksvzjUIit5rBEr55rtPcJSgakPpR2yvd
Q4XjybUmV0IdONMhk/OlqaBPtnA0RG+qTcm7oP1qH/m5zRA0ZplVQ5ylkQwr
LwGq5JQpJkgxxgLIrUbbtzYBShXSr5c1XXR0LIRiNgtb6s1s4mt+fbyExdJF
+ceuu+/xYrW/YTuEJpHxLiZ+aNPW5g5Y7Hbqu3hp3UL/kD44cc8JjZh18spX
p/ncojDhF2r2vhR+CndYcMkpGMV+t1pGKC8wlcFc7lb9GJASnqMGvhQmvIaG
gO/x7UjuTZSBW+kITHHZJDqYryKUv1j0CkHxIn9tWsYOpa1giOFtXX5v0AAM
AJR/s/beLlqwCsUdYnw1TkP/0u0ZK3RPio1nJ7S6ckPfsM7DqCWD8ILD8Cdr
cuzQrWaE30t5PXx53xBPO+6t5wKfDL35WHWG1Irmvz9UuT7tDS3IzwtF4ijF
PX6alTbxGnoHgZ4bG4J1wfpTNPppP1gJeVg67VqOypzdZi+SjofMWnFgRFmD
yEN8xpFUs7A9xryVZOosp9Sfe3IbBkO99sAQ7jV4EoMYk3/GKA==
=LjkG
-----END PGP MESSAGE-----`;

  expect(isGpgEncrypted(content)).toBe(true);
});

test('Should return false if the content is not gpg encrypted', () => {
  const content = `Hello World!`;

  expect(isGpgEncrypted(content)).toBe(false);
});

test('isArmoredPgp should return true for armored PGP string', () => {
  const armored = `-----BEGIN PGP MESSAGE-----\n\nbase64data\n-----END PGP MESSAGE-----`;
  expect(isArmoredPgp(armored)).toBe(true);
});

test('isArmoredPgp should return true for armored PGP public key', () => {
  const armored = `-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nkeydata\n-----END PGP PUBLIC KEY BLOCK-----`;
  expect(isArmoredPgp(armored)).toBe(true);
});

test('isArmoredPgp should return false for plain text string', () => {
  expect(isArmoredPgp('Hello World!')).toBe(false);
});

test('isArmoredPgp should return false for empty string', () => {
  expect(isArmoredPgp('')).toBe(false);
});

test('isArmoredPgp should return true for Uint8Array with armored PGP header', () => {
  const armored = '-----BEGIN PGP MESSAGE-----\n\ndata';
  const bytes = new TextEncoder().encode(armored);
  expect(isArmoredPgp(bytes)).toBe(true);
});

test('isArmoredPgp should return false for Uint8Array with binary content', () => {
  const bytes = new Uint8Array([0x99, 0x01, 0x0d, 0x04, 0x5e]);
  expect(isArmoredPgp(bytes)).toBe(false);
});

test('isArmoredPgp should return false for empty Uint8Array', () => {
  expect(isArmoredPgp(new Uint8Array(0))).toBe(false);
});
