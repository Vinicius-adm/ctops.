import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Badge, EmptyState, FormInput, Loading } from "@/components/Common";
import { Plus, Search, Trash2, Edit2, PlugZap, RefreshCcw, Eye, KeyRound, Link as LinkIcon } from "lucide-react";
import { apisService, type ApiDTO, type CreateApiPayload, type UpdateApiPayload } from "@/services/apis";

// ==================== HELPERS (SEM ANY) ====================
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as { response?: { data?: unknown } };
    const data = e.response?.data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null && "error" in data) {
      const d = data as { error?: unknown };
      if (typeof d.error === "string") return d.error;
    }
  }
  return "Erro inesperado";
}

function renderUpBadge(api: ApiDTO) {
  if (api.is_up === true) return <Badge label="ONLINE" variant="success" />;
  if (api.is_up === false) return <Badge label="OFFLINE" variant="error" />;
  return <Badge label="SEM STATUS" variant="info" />;
}

function safeJsonParseObject(input: string): Record<string, string> | null {
  try {
    const v = JSON.parse(input);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof k === "string" && (typeof val === "string" || typeof val === "number" || typeof val === "boolean")) {
        out[k] = String(val);
      }
    }
    return out;
  } catch {
    return null;
  }
}

function buildUrlWithParams(url: string, paramsJson?: string): string {
  const base = url.trim();
  if (!paramsJson || paramsJson.trim().length === 0) return base;
  const paramsObj = safeJsonParseObject(paramsJson.trim());
  if (!paramsObj) throw new Error("Query params precisa ser um JSON de objeto (ex: {\"date\":\"2026-01-15\"})");

  // URL() exige absoluto; se vier sem protocolo, tenta assumir https
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    u = new URL(base.replace(/^\/\//, "https://").match(/^https?:\/\//) ? base : `https://${base}`);
  }

  for (const [k, v] of Object.entries(paramsObj)) {
    u.searchParams.set(k, v);
  }
  return u.toString();
}

type AuthType = "NONE" | "BEARER" | "HEADER";
type Method = "GET" | "POST" | "PUT" | "PATCH";

export function APIsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [apis, setApis] = useState<ApiDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [urlCurrentMasked, setUrlCurrentMasked] = useState<string>("(nova)");
  const [changeUrl, setChangeUrl] = useState(false);

  const [form, setForm] = useState({
    name: "",
    method: "GET" as Method,

    auth_type: "NONE" as AuthType,
    auth_header_name: "Authorization",
    auth_token: "",

    headers_json: "",

    url: "",
    query_params_json: "",

    check_interval_seconds: "600",
    timeout_seconds: "10",

    body: "{\n  \"exemplo\": true\n}",
    validation_json_key: "",
    description: "",
  });

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return apis;
    return apis.filter((a) => `${a.name} ${a.url}`.toLowerCase().includes(t));
  }, [apis, searchTerm]);

  async function load() {
    try {
      setLoading(true);
      const list = await apisService.list();
      setApis(list ?? []);
    } catch (err) {
      console.error(err);
      setApis([]);
    } finally {
      setLoading(false);
    }
  }

  // TRAVA O SCROLL DO BODY QUANDO MODAL ABERTO (EVITA "ZOOM"/SHIFT VISUAL)
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 30_000);
    return () => clearInterval(t);
  }, []);

  function openCreate() {
    setEditId(null);
    setUrlCurrentMasked("(nova)");
    setChangeUrl(true);
    setForm({
      name: "",
      method: "GET",
      auth_type: "NONE",
      auth_header_name: "Authorization",
      auth_token: "",
      headers_json: "",
      url: "",
      query_params_json: "",
      check_interval_seconds: "600",
      timeout_seconds: "10",
      body: "{\n  \"exemplo\": true\n}",
      validation_json_key: "",
      description: "",
    });
    setModalOpen(true);
  }

  function openEdit(api: ApiDTO) {
    setEditId(api.id);
    setUrlCurrentMasked(api.url ?? "•••");
    setChangeUrl(false);

    setForm({
      name: api.name ?? "",
      method: (api.method ?? "GET") as Method,
      auth_type: (api.auth_type ?? "NONE") as AuthType,
      auth_header_name: api.auth_header_name ?? "Authorization",
      auth_token: "", // NÃO É DEVOLVIDO PELO BACKEND
      headers_json: "", // NÃO É DEVOLVIDO PELO BACKEND
      url: "", // SÓ ENVIA SE USAR "TROCAR"
      query_params_json: "",
      check_interval_seconds: String(api.check_interval_seconds ?? 600),
      timeout_seconds: String(api.timeout_seconds ?? 10),
      body: "", // NÃO É DEVOLVIDO PELO BACKEND
      validation_json_key: api.validation_json_key ?? "",
      description: api.description ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      const name = form.name.trim();
      if (!name) {
        alert("Nome é obrigatório");
        return;
      }

      // URL: CREATE SEMPRE PRECISA. UPDATE SÓ SE "TROCAR".
      const shouldSendUrl = !editId || changeUrl;
      const rawUrl = form.url.trim();
      if (shouldSendUrl && !rawUrl) {
        alert("URL é obrigatória");
        return;
      }

      let finalUrl: string | undefined;
      if (shouldSendUrl) {
        finalUrl = buildUrlWithParams(rawUrl, form.query_params_json);
      }

      const method = form.method;
      const hasBody = method !== "GET";

      const basePayload: CreateApiPayload = {
        name,
        url: finalUrl ?? "https://example.com", // SUBSTITUÍDO LOGO ABAIXO QUANDO NÃO ENVIAR
        method,
        auth_type: form.auth_type,
        auth_header_name: (form.auth_header_name || "Authorization").trim(),
        // SEGREDOS: SÓ ENVIA SE PREENCHER
        ...(form.auth_token.trim().length > 0 ? { auth_token: form.auth_token } : {}),
        ...(form.headers_json.trim().length > 0 ? { headers_json: form.headers_json } : {}),
        ...(hasBody && form.body.trim().length > 0 ? { body: form.body } : {}),
        ...(form.validation_json_key.trim().length > 0 ? { validation_json_key: form.validation_json_key.trim() } : {}),
        ...(form.description.trim().length > 0 ? { description: form.description.trim() } : {}),
        check_interval_seconds: Number(form.check_interval_seconds || "600"),
        timeout_seconds: Number(form.timeout_seconds || "10"),
      };

      // AJUSTA PAYLOAD PARA UPDATE (NÃO ENVIAR CAMPOS DESNECESSÁRIOS)
      let payload: CreateApiPayload | UpdateApiPayload;
      if (editId) {
        const p: UpdateApiPayload = {
          name: basePayload.name,
          method: basePayload.method,
          auth_type: basePayload.auth_type,
          auth_header_name: basePayload.auth_header_name,
          description: basePayload.description,
          validation_json_key: basePayload.validation_json_key,
          check_interval_seconds: basePayload.check_interval_seconds,
          timeout_seconds: basePayload.timeout_seconds,
        };
        if (shouldSendUrl && finalUrl) p.url = finalUrl;
        if (basePayload.auth_token) p.auth_token = basePayload.auth_token;
        if (basePayload.headers_json) p.headers_json = basePayload.headers_json;
        if (basePayload.body) p.body = basePayload.body;
        payload = p;
      } else {
        // CREATE
        payload = { ...basePayload, url: finalUrl! };
      }

      setLoading(true);
      if (editId) {
        await apisService.update(editId, payload as UpdateApiPayload);
      } else {
        await apisService.create(payload as CreateApiPayload);
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta API?")) return;
    try {
      setLoading(true);
      await apisService.remove(id);
      await load();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleTest(id: string) {
    try {
      setLoading(true);
      const r = await apisService.test(id);
      alert(r.ok ? `OK (${r.latency_ms}ms)` : `FALHA: ${r.error ?? "erro"}`);
      await load();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDetails(id: string) {
    navigate(`/apis/${id}`);
  }

  async function handleRevealUrl() {
    if (!editId) return;
    try {
      setLoading(true);
      const r = await apisService.revealUrl(editId);
      alert(`URL completa:\n${r.url}`);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const showBody = form.method !== "GET";
  const showToken = form.auth_type !== "NONE";
  const showAuthHeaderName = form.auth_type === "HEADER";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">APIs</h1>
          <p className="text-gray-600 mt-2">Cadastro e monitoramento (testes automáticos a cada 10 min no backend)</p>
        </div>

        <Button onClick={openCreate} variant="primary" className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nova API</span>
        </Button>
      </div>

      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </Card>

      {loading && <Loading />}

      {!loading && filtered.length === 0 && (
        <EmptyState title="Nenhuma API" description="Cadastre uma API para começar a monitorar" icon="🔌" />
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <Card key={a.id} className="border">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{a.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{a.url}</p>
                </div>

                {renderUpBadge(a)}
              </div>

              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>Último check: {a.last_check_at ? new Date(a.last_check_at).toLocaleString() : "-"}</p>
                <p>HTTP: {typeof (a as any).last_http_status === "number" ? String((a as any).last_http_status) : "-"}</p>
                <p>Latência: {typeof a.latency_ms === "number" ? `${a.latency_ms}ms` : "-"}</p>
                <p>Método: {a.method ?? "GET"}</p>
                <p>Timeout: {a.timeout_seconds ?? 10}s</p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleOpenDetails(a.id)}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-blue-600 hover:bg-blue-50 rounded"
                  aria-label={`Ver detalhes da API ${a.name}`}
                  title="Detalhes"
                >
                  <Eye className="w-4 h-4" />
                  <span>Detalhes</span>
                </button>

                <button
                  onClick={() => openEdit(a)}
                  className="p-2 text-gray-700 hover:bg-gray-50 rounded"
                  aria-label={`Editar API ${a.name}`}
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleTest(a.id)}
                  className="p-2 text-gray-700 hover:bg-gray-50 rounded"
                  aria-label={`Testar API ${a.name}`}
                  title="Testar"
                >
                  <PlugZap className="w-4 h-4" />
                </button>

                <button
                  onClick={() => load()}
                  className="p-2 text-gray-700 hover:bg-gray-50 rounded"
                  aria-label="Atualizar"
                  title="Atualizar"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  aria-label={`Excluir API ${a.name}`}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="min-h-full flex items-start justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-lg my-8">
              <div className="p-6 border-b">
                <h3 className="text-lg font-bold">{editId ? "Editar API" : "Nova API"}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Para POST/PUT/PATCH você pode informar um Body JSON. Token/headers/body ficam salvos criptografados e não
                  são exibidos em tela.
                </p>
              </div>

              <div className="p-6 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Nome" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                    <select
                      value={form.method}
                      onChange={(e) => setForm((s) => ({ ...s, method: e.target.value as Method }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Para POST/PUT/PATCH você pode informar um BODY JSON.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Autenticação</label>
                    <select
                      value={form.auth_type}
                      onChange={(e) => setForm((s) => ({ ...s, auth_type: e.target.value as AuthType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="NONE">Sem token</option>
                      <option value="BEARER">Bearer</option>
                      <option value="HEADER">Header custom</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">O token é salvo criptografado e nunca é exibido no painel.</p>
                  </div>

                  {showAuthHeaderName ? (
                    <FormInput
                      label="Nome do header"
                      value={form.auth_header_name}
                      onChange={(v) => setForm((s) => ({ ...s, auth_header_name: v }))}
                    />
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </div>

                {showToken ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <KeyRound className="w-4 h-4" /> Token
                    </label>
                    <input
                      type="password"
                      value={form.auth_token}
                      onChange={(e) => setForm((s) => ({ ...s, auth_token: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder={editId ? "(deixe vazio para manter o token atual)" : "cole o token aqui"}
                    />
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headers extras (JSON opcional)</label>
                  <textarea
                    value={form.headers_json}
                    onChange={(e) => setForm((s) => ({ ...s, headers_json: e.target.value }))}
                    className="w-full min-h-[84px] px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                    placeholder='{"x-api-key":"...","x-tenant":"..."}'
                  />
                  <p className="text-xs text-gray-500 mt-1">Use para chaves de API / tenant / etc. Também é salvo criptografado.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL atual</label>
                    <div className="flex gap-2">
                      <input
                        value={urlCurrentMasked}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                      />
                      {editId ? (
                        <Button variant="secondary" onClick={() => setChangeUrl((v) => !v)}>
                          {changeUrl ? "Manter" : "Trocar"}
                        </Button>
                      ) : null}
                    </div>
                    {editId ? (
                      <button
                        onClick={handleRevealUrl}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                        type="button"
                      >
                        Revelar URL (admin/dono)
                      </button>
                    ) : null}
                    <p className="text-xs text-gray-500 mt-1">Por segurança, o backend não retorna a URL completa.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" /> URL
                    </label>
                    <input
                      value={form.url}
                      onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))}
                      disabled={!!editId && !changeUrl}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        editId && !changeUrl ? "border-gray-200 bg-gray-50 text-gray-500" : "border-gray-300"
                      }`}
                      placeholder={editId ? "https://..." : "https://..."}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editId && !changeUrl ? "Clique em 'Trocar' para atualizar a URL." : "Informe a URL completa."}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Query params (JSON opcional)</label>
                  <textarea
                    value={form.query_params_json}
                    onChange={(e) => setForm((s) => ({ ...s, query_params_json: e.target.value }))}
                    className="w-full min-h-[64px] px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                    placeholder='{"date":"2026-01-15","tipo":"A"}'
                    disabled={!!editId && !changeUrl}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se a API exigir parâmetros de busca (ex: data), você pode preencher aqui. Os parâmetros serão anexados à URL
                    ao salvar. (No modo edição, precisa "Trocar" para aplicar.)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Intervalo (s)"
                    value={form.check_interval_seconds}
                    onChange={(v) => setForm((s) => ({ ...s, check_interval_seconds: v }))}
                  />
                  <FormInput
                    label="Timeout (s)"
                    value={form.timeout_seconds}
                    onChange={(v) => setForm((s) => ({ ...s, timeout_seconds: v }))}
                  />
                </div>

                {showBody ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body (JSON)</label>
                    <textarea
                      value={form.body}
                      onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
                      className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                      placeholder='{"exemplo":true}'
                    />
                    <p className="text-xs text-gray-500 mt-1">O BODY é salvo criptografado no backend.</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Validação (opcional)"
                    value={form.validation_json_key}
                    onChange={(v) => setForm((s) => ({ ...s, validation_json_key: v }))}
                    placeholder="Chave JSON que deve existir (ex: data.items)"
                  />
                  <FormInput
                    label="Descrição"
                    value={form.description}
                    onChange={(v) => setForm((s) => ({ ...s, description: v }))}
                  />
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
