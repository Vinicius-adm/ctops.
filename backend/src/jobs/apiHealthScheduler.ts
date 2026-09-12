import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { ensureDbConnection } from "@/lib/db";
import { decryptField } from "@/utils/secureField";

let task: ScheduledTask | null = null;
let isRunning = false;

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

function summarizeError(message?: string | null): string | null {
  if (!message) return null;
  const m = String(message);
  return m.length > 200 ? m.slice(0, 200) + "…" : m;
}

async function validateJsonKey(response: Response, jsonKey?: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!jsonKey) return { ok: true };

  let data: any;
  try {
    const text = await response.text();
    if (!text) return { ok: false, error: "Resposta vazia" };
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Resposta não é JSON válido" };
  }

  const parts = String(jsonKey).split(".").filter(Boolean);
  let cur = data;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return { ok: false, error: `Chave '${jsonKey}' ausente no JSON` };
  }

  return { ok: true };
}

function nowMs() {
  return Date.now();
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  method: string,
  body?: string | null,
  headersExtra?: Record<string, string>,
) {
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
        ...(headersExtra ?? {}),
        ...(hasBody && !Object.keys(headersExtra ?? {}).some((k) => k.toLowerCase() === "content-type")
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(hasBody ? { body: body && body.trim().length > 0 ? body : "{}" } : {}),
    });

    return res;
  } finally {
    clearTimeout(t);
  }
}

async function checkOne(api: {
  id: string;
  url: string;
  timeout_seconds: number;
  method?: string | null;
  body?: string | null;
  validation_json_key?: string | null;
  auth_type?: string | null;
  auth_header_name?: string | null;
  auth_token?: string | null;
  headers_json?: string | null;
}) {
  const timeoutMs = Math.max(1000, (api.timeout_seconds ?? 10) * 1000);

  const apiUrl = decryptField(String(api.url ?? ""));
  if (!apiUrl) {
    // NAO CONSEGUE CHECAR SEM URL REAL - MARCA COMO OFFLINE E REGISTRA EVENTO
    const error_message = "URL indisponível (chave de criptografia ausente/ inválida)";
    await prisma.aPI.update({
      where: { id: api.id },
      data: { last_check_at: new Date(), is_up: false, latency_ms: null, last_http_status: null, last_error: summarizeError(error_message) },
    });
    try {
      await prisma.aPIHealthEvent.create({
        data: {
          api_id: api.id,
          ok: false,
          status: null,
          latency_ms: 0,
          error: summarizeError(error_message),
          checked_at: new Date(),
        },
      });
    } catch {}
    return { ok: false, latency_ms: 0, status: null, error_message };
  }

  const t0 = nowMs();

  let ok = false;
  let latency_ms = 0;

  // ✅ GUARDA STATUS E ERRO CORRETAMENTE
  let status: number | null = null;
  let error_message: string | null = null;

  try {
    const method = String(api.method ?? "GET").toUpperCase();
    const body = api.body ? decryptField(String(api.body)) : null;
    const authType = String(api.auth_type ?? "NONE").toUpperCase();
    const authHeaderName = String(api.auth_header_name ?? "Authorization").trim() || "Authorization";
    const authToken = api.auth_token ? decryptField(String(api.auth_token)) : null;
    const headersJsonDecrypted = api.headers_json ? decryptField(String(api.headers_json)) : null;
    const extraHeaders = parseHeadersJson(headersJsonDecrypted);

    // MONTA HEADERS (NUNCA LOGAR TOKEN)
    const headers: Record<string, string> = {
      ...extraHeaders,
    };
    if (authType === "BEARER" && authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    } else if (authType === "HEADER" && authToken) {
      headers[authHeaderName] = authToken;
    }

    const r = await fetchWithTimeout(apiUrl, timeoutMs, method, body, headers);

    status = r.status;
    ok = r.status >= 200 && r.status < 400;

    if (!ok) {
      error_message = `HTTP ${r.status}`;
    } else {
      const v = await validateJsonKey(r, api.validation_json_key ?? null);
      if (!v.ok) {
        ok = false;
        error_message = v.error ?? "Falha na validação";
      }
    }
  } catch (e: any) {
    ok = false;
    error_message =
      e?.name === "AbortError" ? "Timeout" : (e?.message ?? "Request failed");
  } finally {
    latency_ms = nowMs() - t0;
  }

  // ✅ ATUALIZA STATUS ATUAL NA TABELA API
  await prisma.aPI.update({
    where: { id: api.id },
    data: {
      last_check_at: new Date(),
      is_up: ok,
      latency_ms,
      last_http_status: status,
      last_error: summarizeError(error_message),
    },
  });

  // ✅ SALVA EVENTO DE HISTÓRICO (APIHealthEvent)
  try {
    await prisma.aPIHealthEvent.create({
      data: {
        api_id: api.id,
        ok,
        status,
        latency_ms,
        error: summarizeError(error_message),
        checked_at: new Date(),
      },
    });
  } catch (e) {
    console.error("APIHealthEvent.create error:", e);
  }

  return { ok, latency_ms, status, error_message };
}

async function runAllOnce() {
  if (isRunning) return;
  isRunning = true;

  try {
    const ok = await ensureDbConnection({ retries: 1, initialDelayMs: 0, logPrefix: "[API HEALTH]" });
    if (!ok) return;

    const apis = await prisma.aPI.findMany({
      select: {
        id: true,
        url: true,
        timeout_seconds: true,
        method: true,
        body: true,
        validation_json_key: true,
        auth_type: true,
        auth_header_name: true,
        auth_token: true,
        headers_json: true,
      },
    });

    for (const api of apis) {
      // eslint-disable-next-line no-await-in-loop
      await checkOne(api);
    }
  } catch (err) {
    console.error("API health scheduler error:", err);
  } finally {
    isRunning = false;
  }
}

/**
 * ✅ RODA AUTOMÁTICO A CADA 10 MINUTOS
 */
export function startApiHealthScheduler() {
  if (task) return;

  // RODA UMA VEZ NA SUBIDA
  runAllOnce().catch(() => {});

  task = cron.schedule("*/10 * * * *", async () => {
    await runAllOnce();
  });

  task.start();
}

export async function shutdownApiHealthScheduler() {
  try {
    if (task) {
      task.stop();
      // @ts-expect-error destroy exists in node-cron
      task.destroy?.();
      task = null;
    }
  } catch {}
}
