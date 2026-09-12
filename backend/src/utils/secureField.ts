// HELPERS PARA CAMPOS ENCRIPTADOS (COMPATIVEL COM DADOS ANTIGOS EM TEXTO PURO)

import { decrypt, encrypt } from "@/utils/crypto";

function looksLikeEncrypted(payload: string): boolean {
  // FORMATO: ivB64:tagB64:cipherB64
  const parts = payload.split(":");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length >= 8);
}

export function encryptField(plaintext: string): string {
  return encrypt(plaintext);
}

export function decryptField(maybeEncrypted: string): string {
  if (!maybeEncrypted) return "";
  if (!looksLikeEncrypted(maybeEncrypted)) return maybeEncrypted;
  try {
    return decrypt(maybeEncrypted);
  } catch {
    // SE PARECE ENCRIPTADO MAS NAO CONSEGUE DECRIPTAR (CHAVE ERRADA),
    // EVITA QUE A APLICACAO QUEBRE.
    return "";
  }
}
