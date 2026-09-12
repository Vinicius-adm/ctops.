import { Response as ExpressResponse } from "express";
import { RequestWithUser } from "@/types";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { maskUrl } from "@/utils/mask";
import { decryptField, encryptField } from "@/utils/secureField";
import { fingerprintUrl } from "@/utils/fingerprint";

const createAPISchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH"]).optional().default("GET"),
  body: z.string().optional(),
  auth_type: z.enum(["NONE", "BEARER", "HEADER"]).optional().default("NONE"),
  auth_header_name: z.string().optional(),
  auth_token: z.string().optional(),
  headers_json: z.string().optional(),
  validation_json_key: z.string().optional(),
  description: z.string().optional(),
  check_interval_seconds: z.number().int().positive().optional().default(300),
  timeout_seconds: z.number().int().positive().optional().default(10),
});

const updateAPISchema = createAPISchema.partial();

function toSafeApi(api: any) {
  // A URL E ARMAZENADA ENCRIPTADA NO BANCO.
  // NO RETORNO PARA O FRONT, SEMPRE MANDA MASCARADA.
  const decryptedUrl = decryptField(String(api.url ?? ""));
  return {
    ...api,
    url: decryptedUrl ? maskUrl(decryptedUrl) : "â€¢â€¢â€¢",
    fingerprint: decryptedUrl ? fingerprintUrl(decryptedUrl) : null,
    // NUNCA RETORNAR BODY EM CLARO
    body: undefined,
    // NUNCA RETORNAR TOKEN/HEADERS EM CLARO
    auth_token: undefined,
    headers_json: undefined,
    // FLAGS PARA O FRONT SABER SE EXISTE CONFIG
    has_auth_token: Boolean(api.auth_token),
    has_headers_json: Boolean(api.headers_json),
    has_body: Boolean(api.body),
    // GARANTE QUE VALIDACAO FICA VISIVEL (SEM SEGREDOS)
    validation_json_key: api.validation_json_key ?? null,
  };
}

function parseHeadersJson(headersJson: string | null | undefined): Record<string, string> {
  if (!headersJson) return {};
  try {
    const parsed = JSON.parse(headersJson);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}


function nowMs() {
  return Date.now();
}

async function fetchWithTimeout(url: string, timeoutMs: number, method: string, body?: string | null) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const hasBody = ["POST", "PUT", "PATCH"].includes(String(method).toUpperCase());
    const res = await fetch(url, {
      method: String(method).toUpperCase(),
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "CTOps-HealthCheck/1.0",
        Accept: "application/json, text/plain, */*",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      ...(hasBody
        ? {
            body: body && body.trim().length > 0 ? body : "{}",
          }
        : {}),
    });

    return res;
  } finally {
    clearTimeout(t);
  }
}

function summarizeError(message?: string | null): string | null {
  if (!message) return null;
  const m = String(message);
  return m.length > 200 ? m.slice(0, 200) + "â€¦" : m;
}

async function validateJsonKey(response: Response, jsonKey?: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!jsonKey) return { ok: true };

  // TENTA LER COMO JSON
  let data: any;
  try {
    const text = await response.text();
    if (!text) return { ok: false, error: "Resposta vazia" };
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Resposta nÃ£o Ã© JSON vÃ¡lido" };
  }

  // SUPORTA CHAVE ANINHADA: a.b.c
  const parts = String(jsonKey).split(".").filter(Boolean);
  let cur = data;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return { ok: false, error: `Chave '${jsonKey}' ausente no JSON` };
  }

  return { ok: true };
}

export async function testAPI(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const api = await prisma.aPI.findUnique({ where: { id } });

    if (!api) {
      res.status(404).json({ error: "API not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && api.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    const timeoutMs = Math.max(1000, (api.timeout_seconds ?? 10) * 1000);

    const apiUrl = decryptField(String(api.url ?? ""));
    if (!apiUrl) {
      res.status(500).json({ error: "URL da API não está disponível (chave de encriptação ausente/inválida)" });
      return;
    }

    const t0 = nowMs();
    let ok = false;
    let status: number | undefined;
    let error: string | undefined;

    try {
      // SUPORTA METODO + BODY + AUTH/TOKENS (OPÃ‡ÃƒO 1)
      const method = String((api as any).method ?? "GET").toUpperCase();
      const bodyEnc = (api as any).body ? decryptField(String((api as any).body)) : null;

      const authType = String((api as any).auth_type ?? "NONE").toUpperCase();
      const authHeaderName = String((api as any).auth_header_name ?? "Authorization").trim() || "Authorization";
      const authToken = (api as any).auth_token ? decryptField(String((api as any).auth_token)) : null;
      const headersJsonDecrypted = (api as any).headers_json ? decryptField(String((api as any).headers_json)) : null;
      const extraHeaders = parseHeadersJson(headersJsonDecrypted);

      const headers: Record<string, string> = {
        "User-Agent": "CTOps-HealthCheck/1.0",
        Accept: "application/json, text/plain, */*",
        ...extraHeaders,
      };

      if (authType === "BEARER" && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      } else if (authType === "HEADER" && authToken) {
        headers[authHeaderName] = authToken;
      }

      const hasBody = method !== "GET" && method !== "HEAD";
      if (hasBody && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
      }
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const r = await fetch(apiUrl, {
          method,
          signal: controller.signal,
          redirect: "follow",
          headers,
          body: hasBody ? (bodyEnc ?? "{}") : undefined,
        });
        status = r.status;
        ok = r.status >= 200 && r.status < 400;
        if (!ok) {
          error = `HTTP ${r.status}`;
        } else {
          // VALIDACAO OPCIONAL POR CHAVE JSON
          const v = await validateJsonKey(r, (api as any).validation_json_key ?? null);
          if (!v.ok) {
            ok = false;
            error = v.error;
          }
        }
      } finally {
        clearTimeout(t);
      }
    } catch (e: any) {
      ok = false;
      error = e?.name === "AbortError" ? "Timeout" : (e?.message ?? "Request failed");
    }

    const latency_ms = nowMs() - t0;

    await prisma.aPI.update({
      where: { id },
      data: {
        last_check_at: new Date(),
        is_up: ok,
        latency_ms,
        last_http_status: typeof status === "number" ? status : null,
        last_error: summarizeError(error) ?? null,
      },
    });
    // âœ… SALVA EVENTO DE HISTÃ“RICO
    try {
      await prisma.aPIHealthEvent.create({
        data: {
          api_id: id,
          ok,
          status: typeof status === "number" ? status : null,
          latency_ms,
          error: summarizeError(error) ?? null,
          checked_at: new Date(),
        },
      });
    } catch (e) {
      // NÃƒO QUEBRA O FLUXO SE O HISTÃ“RICO FALHAR
      console.error("APIHealthEvent.create error:", e);
    }


    res.json({
      ok,
      latency_ms,
      status,
      fingerprint: apiUrl ? fingerprintUrl(apiUrl) : null,
      validation_json_key: (api as any).validation_json_key ?? null,
      message: ok ? "OK" : "FAIL",
      error: summarizeError(error),
    });
  } catch (error) {
    console.error("Test API error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function createAPI(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const data = createAPISchema.parse(req.body);

    const encryptedUrl = encryptField(data.url);
    const encryptedBody = typeof data.body === "string" && data.body.trim().length > 0 ? encryptField(data.body) : null;
    const encryptedToken = typeof data.auth_token === "string" && data.auth_token.trim().length > 0 ? encryptField(data.auth_token) : null;
    const encryptedHeadersJson = typeof data.headers_json === "string" && data.headers_json.trim().length > 0 ? encryptField(data.headers_json) : null;

    const api = await prisma.aPI.create({
      data: {
        ...data,
        url: encryptedUrl,
        body: encryptedBody,
        auth_token: encryptedToken,
        headers_json: encryptedHeadersJson,
        auth_header_name: (data.auth_header_name ?? "Authorization").trim() || "Authorization",
        owner_user_id: req.user.sub,
      },
    });

    res.status(201).json(toSafeApi(api));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Create API error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function listAPIs(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const query = req.user.role === "ADMIN_MASTER" ? {} : { owner_user_id: req.user.sub };

    const apis = await prisma.aPI.findMany({
      where: query,
      orderBy: { created_at: "desc" },
    });

    res.json(apis.map(toSafeApi));
  } catch (error) {
    console.error("List APIs error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function getAPI(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const api = await prisma.aPI.findUnique({
      where: { id },
    });

    if (!api) {
      res.status(404).json({ error: "API not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && api.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    res.json(toSafeApi(api));
  } catch (error) {
    console.error("Get API error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// âœ… ENDPOINT PARA REVELAR URL (SOMENTE DONO OU ADMIN) - USO PONTUAL
export async function revealAPIUrl(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const api = await prisma.aPI.findUnique({ where: { id } });
    if (!api) {
      res.status(404).json({ error: "API not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && api.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    const url = decryptField(String(api.url ?? ""));
    if (!url) {
      res.status(500).json({ error: "URL da API não está disponível (chave de encriptação ausente/inválida)" });
      return;
    }

    res.json({ url });
  } catch (error) {
    console.error("Reveal API URL error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}


export async function getAPIHistory(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const api = await prisma.aPI.findUnique({ where: { id } });
    if (!api) {
      res.status(404).json({ error: "API not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && api.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    // range: "24h" (default) | "7d" | "30d"
    const range = String((req.query.range ?? "24h")).toLowerCase();
    const now = new Date();
    const from = new Date(now);
    if (range === "7d") from.setDate(now.getDate() - 7);
    else if (range === "30d") from.setDate(now.getDate() - 30);
    else from.setHours(now.getHours() - 24);

    const events = await prisma.aPIHealthEvent.findMany({
      where: { api_id: id, checked_at: { gte: from, lte: now } },
      orderBy: { checked_at: "desc" },
      take: 500,
    });

    res.json({ range, from, to: now, events });
  } catch (error) {
    console.error("Get API history error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function updateAPI(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;
    const data = updateAPISchema.parse(req.body);

    const api = await prisma.aPI.findUnique({ where: { id } });

    if (!api) {
      res.status(404).json({ error: "API not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && api.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    const toUpdate: any = { ...data };

    // SE URL NAO FOI ENVIADA NO UPDATE, MANTEM A EXISTENTE.
    if (typeof data.url === "string") {
      // SE VEIO VAZIA, IGNORA
      if (data.url.trim().length === 0) {
        delete toUpdate.url;
      } else {
        toUpdate.url = encryptField(data.url.trim());
      }
    }

    // BODY: SE ENVIAR, ATUALIZA (ENCRIPTADO). SE VAZIO, IGNORA.
    if (typeof (data as any).body === "string") {
      const b = String((data as any).body);
      if (b.trim().length === 0) {
        delete toUpdate.body;
      } else {
        toUpdate.body = encryptField(b);
      }
    }

    // AUTH TOKEN: SE ENVIAR, ATUALIZA (ENCRIPTADO). SE VAZIO, IGNORA.
    if (typeof (data as any).auth_token === "string") {
      const tok = String((data as any).auth_token);
      if (tok.trim().length === 0) {
        delete toUpdate.auth_token;
      } else {
        toUpdate.auth_token = encryptField(tok);
      }
    }

    // HEADERS JSON: SE ENVIAR, ATUALIZA (ENCRYPT). SE VAZIO, IGNORA.
    if (typeof (data as any).headers_json === "string") {
      const hj = String((data as any).headers_json);
      if (hj.trim().length === 0) {
        delete toUpdate.headers_json;
      } else {
        toUpdate.headers_json = encryptField(hj);
      }
    }

    if (typeof (data as any).auth_header_name === "string") {
      const hn = String((data as any).auth_header_name).trim();
      if (hn.length > 0) toUpdate.auth_header_name = hn;
    }

    const updated = await prisma.aPI.update({
      where: { id },
      data: toUpdate,
    });

    res.json(toSafeApi(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Entrada invÃ¡lida", details: error.errors });
      return;
    }
    console.error("Update API error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function deleteAPI(req: RequestWithUser, res: ExpressResponse): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "NÃ£o autorizado" });
      return;
    }

    const { id } = req.params;

    const api = await prisma.aPI.findUnique({ where: { id } });

    if (!api) {
      res.status(404).json({ error: "API not found" });
      return;
    }

    if (req.user.role !== "ADMIN_MASTER" && api.owner_user_id !== req.user.sub) {
      res.status(403).json({ error: "Proibido" });
      return;
    }

    await prisma.aPI.delete({ where: { id } });

    res.json({ message: "API deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "API not found" });
      return;
    }
    console.error("Delete API error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

