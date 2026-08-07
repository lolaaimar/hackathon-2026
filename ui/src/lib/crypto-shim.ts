const webcrypto: Crypto = globalThis.crypto;

export function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (array === null) {
    throw new Error("crypto-shim: array must not be null");
  }
  return webcrypto.getRandomValues(array as ArrayBufferView<ArrayBuffer>) as T;
}

export function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  webcrypto.getRandomValues(bytes);
  return bytes;
}

export const subtle = webcrypto.subtle;

export default webcrypto;
