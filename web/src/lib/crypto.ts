/**
 * Client-side End-to-End Encryption (AES-256-GCM + PBKDF2-SHA256)
 * Bit-for-bit compatible with mobile/lib/crypto.ts.
 */

const DEK_SESSION_KEY = 'noteapp_e2ee_dek_b64';
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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function isEncryptedValue(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export function getActiveDek(): Uint8Array | null {
  if (cachedDek) return cachedDek;
  if (typeof window === 'undefined') return null;
  try {
    const b64 = sessionStorage.getItem(DEK_SESSION_KEY);
    if (b64) {
      cachedDek = base64ToBytes(b64);
      return cachedDek;
    }
  } catch {
    // ignore
  }
  return null;
}

export function storeActiveDek(dek: Uint8Array): void {
  cachedDek = dek;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(DEK_SESSION_KEY, bytesToBase64(dek));
    } catch {
      // ignore
    }
  }
}

export function clearActiveDek(): void {
  cachedDek = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(DEK_SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(rawKey), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptWithKey(plaintext: string, rawKey: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(rawKey);
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoded)
  );
  return `${ENC_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipherBuf))}`;
}

export async function decryptWithKey(envelope: string, rawKey: Uint8Array): Promise<string> {
  if (!isEncryptedValue(envelope)) return envelope;
  const body = envelope.slice(ENC_PREFIX.length);
  const sep = body.indexOf(':');
  if (sep === -1) throw new Error('Malformed encrypted payload');
  const iv = base64ToBytes(body.slice(0, sep));
  const cipherBytes = base64ToBytes(body.slice(sep + 1));
  const key = await importAesKey(rawKey);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(cipherBytes)
  );
  return new TextDecoder().decode(plainBuf);
}

async function deriveKek(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );
  return new Uint8Array(bits);
}

export function generateRecoveryKey(): string {
  const raw = crypto.getRandomValues(new Uint8Array(24));
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
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const dek = crypto.getRandomValues(new Uint8Array(32));
  const recoveryKey = generateRecoveryKey();

  const kek = await deriveKek(passphrase, salt);
  const recoveryKek = await deriveKek(recoveryKey, salt);

  const wrappedDek = await encryptWithKey(bytesToBase64(dek), kek);
  const recoveryWrappedDek = await encryptWithKey(bytesToBase64(dek), recoveryKek);
  const verifier = await encryptWithKey(VERIFIER_PLAINTEXT, dek);

  storeActiveDek(dek);

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
  const dekB64 = await decryptWithKey(wrapped, kek);
  const dek = base64ToBytes(dekB64);

  const check = await decryptWithKey(bundle.encryption_verifier, dek);
  if (check !== VERIFIER_PLAINTEXT) {
    throw new Error('Invalid passphrase or recovery key.');
  }

  storeActiveDek(dek);
  return dek;
}

export async function encryptNoteFields<
  T extends { title: string; content: string; tags?: string[] }
>(note: T): Promise<T> {
  const dek = getActiveDek();
  if (!dek) return note;

  const tags = note.tags || [];
  return {
    ...note,
    title: isEncryptedValue(note.title) ? note.title : await encryptWithKey(note.title || '', dek),
    content: isEncryptedValue(note.content)
      ? note.content
      : await encryptWithKey(note.content || '', dek),
    tags:
      tags.length === 1 && isEncryptedValue(tags[0])
        ? tags
        : [await encryptWithKey(JSON.stringify(tags), dek)],
  };
}

export async function decryptNoteFields<
  T extends { title: string; content: string; tags?: string[] }
>(note: T): Promise<T & { isLocked?: boolean }> {
  const tags = note.tags || [];
  const hasEncrypted =
    isEncryptedValue(note.title) ||
    isEncryptedValue(note.content) ||
    (tags.length === 1 && isEncryptedValue(tags[0]));

  if (!hasEncrypted) return note;

  const dek = getActiveDek();
  if (!dek) {
    return {
      ...note,
      title: isEncryptedValue(note.title) ? '🔒 Encrypted Note' : note.title,
      content: isEncryptedValue(note.content) ? '' : note.content,
      tags: tags.length === 1 && isEncryptedValue(tags[0]) ? [] : tags,
      isLocked: true,
    };
  }

  try {
    const decTitle = isEncryptedValue(note.title)
      ? await decryptWithKey(note.title, dek)
      : note.title;
    const decContent = isEncryptedValue(note.content)
      ? await decryptWithKey(note.content, dek)
      : note.content;
    let decTags = tags;
    if (tags.length === 1 && isEncryptedValue(tags[0])) {
      decTags = JSON.parse(await decryptWithKey(tags[0], dek));
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
