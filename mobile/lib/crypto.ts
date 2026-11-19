import * as SecureStore from 'expo-secure-store';
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const DEK_STORAGE_KEY = 'noteapp_e2ee_dek_b64';
const ENC_PREFIX = 'enc:v1:';
const VERIFIER_PLAINTEXT = 'noteapp-e2ee-ok';
const PBKDF2_ITERATIONS = 100_000;

let cachedDek: Uint8Array | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8Encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function isEncryptedValue(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export async function getActiveDek(): Promise<Uint8Array | null> {
  if (cachedDek) return cachedDek;
  try {
    const b64 = await SecureStore.getItemAsync(DEK_STORAGE_KEY);
    if (b64) {
      cachedDek = base64ToBytes(b64);
      return cachedDek;
    }
  } catch {
    // ignore SecureStore errors
  }
  return null;
}

export async function storeActiveDek(dek: Uint8Array): Promise<void> {
  cachedDek = dek;
  await SecureStore.setItemAsync(DEK_STORAGE_KEY, bytesToBase64(dek));
}

export async function clearActiveDek(): Promise<void> {
  cachedDek = null;
  try {
    await SecureStore.deleteItemAsync(DEK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function encryptWithKey(plaintext: string, key: Uint8Array): string {
  const iv = randomBytes(12);
  const aes = gcm(key, iv);
  const ciphertext = aes.encrypt(utf8Encode(plaintext));
  return `${ENC_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

export function decryptWithKey(envelope: string, key: Uint8Array): string {
  if (!isEncryptedValue(envelope)) return envelope;
  const body = envelope.slice(ENC_PREFIX.length);
  const sep = body.indexOf(':');
  if (sep === -1) throw new Error('Malformed encrypted payload');
  const iv = base64ToBytes(body.slice(0, sep));
  const ciphertext = base64ToBytes(body.slice(sep + 1));
  const aes = gcm(key, iv);
  return utf8Decode(aes.decrypt(ciphertext));
}

async function deriveKek(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  return pbkdf2Async(sha256, utf8Encode(passphrase), salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32,
  });
}

export function generateRecoveryKey(): string {
  const raw = randomBytes(24);
  return bytesToBase64(raw)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface KeyBundlePayload {
  encryption_salt: string;
  encryption_verifier: string;
  wrapped_dek: string;
  recovery_wrapped_dek: string;
}

export async function setupE2eeKeys(passphrase: string): Promise<{
  bundle: KeyBundlePayload;
  recoveryKey: string;
  dek: Uint8Array;
}> {
  const salt = randomBytes(16);
  const dek = randomBytes(32);
  const recoveryKey = generateRecoveryKey();

  const kek = await deriveKek(passphrase, salt);
  const recoveryKek = await deriveKek(recoveryKey, salt);

  const wrappedDek = encryptWithKey(bytesToBase64(dek), kek);
  const recoveryWrappedDek = encryptWithKey(bytesToBase64(dek), recoveryKek);
  const verifier = encryptWithKey(VERIFIER_PLAINTEXT, dek);

  await storeActiveDek(dek);

  return {
    bundle: {
      encryption_salt: bytesToBase64(salt),
      encryption_verifier: verifier,
      wrapped_dek: wrappedDek,
      recovery_wrapped_dek: recoveryWrappedDek,
    },
    recoveryKey,
    dek,
  };
}

export async function unlockE2eeWithSecret(
  secret: string,
  bundle: {
    encryption_salt: string;
    encryption_verifier: string;
    wrapped_dek: string;
    recovery_wrapped_dek?: string | null;
  },
  isRecoveryKey = false
): Promise<Uint8Array> {
  const salt = base64ToBytes(bundle.encryption_salt);
  const kek = await deriveKek(secret.trim(), salt);
  const wrapped = isRecoveryKey ? bundle.recovery_wrapped_dek : bundle.wrapped_dek;
  if (!wrapped) {
    throw new Error('Recovery key is not configured for this account.');
  }
  const dekB64 = decryptWithKey(wrapped, kek);
  const dek = base64ToBytes(dekB64);

  const check = decryptWithKey(bundle.encryption_verifier, dek);
  if (check !== VERIFIER_PLAINTEXT) {
    throw new Error('Invalid passphrase or recovery key.');
  }

  await storeActiveDek(dek);
  return dek;
}

export async function encryptNoteFields<
  T extends { title: string; content: string; tags: string[] }
>(note: T): Promise<T> {
  const dek = await getActiveDek();
  if (!dek) return note;

  return {
    ...note,
    title: isEncryptedValue(note.title) ? note.title : encryptWithKey(note.title || '', dek),
    content: isEncryptedValue(note.content)
      ? note.content
      : encryptWithKey(note.content || '', dek),
    tags:
      note.tags.length === 1 && isEncryptedValue(note.tags[0])
        ? note.tags
        : [encryptWithKey(JSON.stringify(note.tags || []), dek)],
  };
}

export async function decryptNoteFields<
  T extends { title: string; content: string; tags: string[] }
>(note: T): Promise<T & { isLocked?: boolean }> {
  const hasEncrypted =
    isEncryptedValue(note.title) ||
    isEncryptedValue(note.content) ||
    (note.tags.length === 1 && isEncryptedValue(note.tags[0]));

  if (!hasEncrypted) return note;

  const dek = await getActiveDek();
  if (!dek) {
    return {
      ...note,
      title: isEncryptedValue(note.title) ? '🔒 Encrypted Note' : note.title,
      content: isEncryptedValue(note.content) ? '' : note.content,
      tags: note.tags.length === 1 && isEncryptedValue(note.tags[0]) ? [] : note.tags,
      isLocked: true,
    };
  }

  try {
    const decTitle = isEncryptedValue(note.title) ? decryptWithKey(note.title, dek) : note.title;
    const decContent = isEncryptedValue(note.content)
      ? decryptWithKey(note.content, dek)
      : note.content;
    let decTags = note.tags;
    if (note.tags.length === 1 && isEncryptedValue(note.tags[0])) {
      decTags = JSON.parse(decryptWithKey(note.tags[0], dek));
    }
    return {
      ...note,
      title: decTitle,
      content: decContent,
      tags: Array.isArray(decTags) ? decTags : [],
      isLocked: false,
    };
  } catch {
    return {
      ...note,
      title: '🔒 Encrypted Note (Wrong Key)',
      content: '',
      tags: [],
      isLocked: true,
    };
  }
}
