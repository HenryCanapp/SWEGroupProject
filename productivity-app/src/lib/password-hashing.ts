import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const HASH_SCHEME = 'pbkdf2_sha256';
const ITERATIONS = 600_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string) {
  if (!/^(?:[\da-f]{2})+$/i.test(value)) {
    return null;
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function isPasswordHash(value: string) {
  return value.startsWith(`${HASH_SCHEME}$`);
}

export async function hashPassword(password: string) {
  const salt = await Crypto.getRandomBytesAsync(SALT_LENGTH);
  const derivedKey = await pbkdf2Async(sha256, password, salt, {
    c: ITERATIONS,
    dkLen: KEY_LENGTH,
    asyncTick: 10,
  });

  return `${HASH_SCHEME}$${ITERATIONS}$${toHex(salt)}$${toHex(derivedKey)}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterationText, saltText, expectedText] = storedHash.split('$');
  if (scheme !== HASH_SCHEME || !iterationText || !saltText || !expectedText) {
    return false;
  }

  const iterations = Number(iterationText);
  const salt = fromHex(saltText);
  const expected = fromHex(expectedText);
  if (
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    iterations > 1_000_000 ||
    salt?.length !== SALT_LENGTH ||
    expected?.length !== KEY_LENGTH
  ) {
    return false;
  }

  const actual = await pbkdf2Async(sha256, password, salt, {
    c: iterations,
    dkLen: KEY_LENGTH,
    asyncTick: 10,
  });

  let difference = 0;
  for (let index = 0; index < KEY_LENGTH; index++) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}