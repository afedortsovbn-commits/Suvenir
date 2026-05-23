import type { Role, User } from "@/lib/types";

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function hashPassword(password: string, salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(salt),
      iterations: 180000,
      hash: "SHA-256"
    },
    key,
    256
  );
  return { hash: bytesToBase64(new Uint8Array(bits)), salt };
}

export async function verifyPassword(password: string, user: User) {
  const result = await hashPassword(password, user.salt);
  return result.hash === user.passwordHash;
}

export async function createUser(login: string, password: string, role: Role): Promise<User> {
  const { hash, salt } = await hashPassword(password);
  return {
    id: crypto.randomUUID(),
    login,
    role,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString()
  };
}
