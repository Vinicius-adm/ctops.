import crypto from "crypto";

// GERA UM IDENTIFICADOR ESTAVEL (SEM VAZAR A URL) USANDO SALT
// - NÃO ARMAZENAMOS URL EM CLARO
// - O FRONT RECEBE APENAS O FINGERPRINT
export function fingerprintUrl(url: string): string {
  const salt = process.env.API_FINGERPRINT_SALT || process.env.JWT_SECRET || "ctops";
  const h = crypto.createHash("sha256");
  h.update(salt);
  h.update("|");
  h.update(url);
  // 12 chars é suficiente pra identificar sem expor muito
  return h.digest("hex").slice(0, 12).toUpperCase();
}
