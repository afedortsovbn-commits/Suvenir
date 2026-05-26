import type { Role, User } from "@/lib/types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

async function deriveTokenKey(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(`github-token:${salt}`),
      iterations: 180000,
      hash: "SHA-256"
    },
    key,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptGitHubToken(token: string, password: string, salt: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveTokenKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(token));
  return {
    iv: bytesToBase64(iv),
    value: bytesToBase64(new Uint8Array(encrypted))
  };
}

export async function decryptGitHubToken(user: User, password: string) {
  if (!user.githubToken) return "";
  const key = await deriveTokenKey(password, user.salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(user.githubToken.iv) },
    key,
    base64ToBytes(user.githubToken.value)
  );
  return decoder.decode(decrypted);
}

export async function verifyPassword(password: string, user: User) {
  const result = await hashPassword(password, user.salt);
  return result.hash === user.passwordHash;
}

export async function createUser(login: string, password: string, role: Role, githubToken?: string): Promise<User> {
  const { hash, salt } = await hashPassword(password);
  const user: User = {
    id: crypto.randomUUID(),
    login,
    role,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString()
  };
  if (githubToken?.trim()) {
    user.githubToken = await encryptGitHubToken(githubToken.trim(), password, salt);
  }
  return user;
}
