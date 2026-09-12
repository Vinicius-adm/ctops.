import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Button, Loading } from "@/components/Common";
import api from "@/services/api";

type ContainerDTO = {
  id: string;
  name: string;
  image: string;
  registry?: string | null;
  host?: string | null;
  status?: string | null;
  restarts?: number | null;
  enabled?: boolean;
  polling_interval_seconds?: number | null;
  last_seen_at?: string | null;
  provider?: string | null;
  created_at?: string;
  updated_at?: string;
};

type HistoryItemDTO = {
  id: string;
  container_id: string;
  timestamp: string;
  level: string;
  message: string;
};

function getErrMsg(err: any) {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || "Erro desconhecido";
}

export default function ContainerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [container, setContainer] = useState<ContainerDTO | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    image: "",
    registry: "",
    host: "",
    enabled: true,
    polling_interval_seconds: "60",
  });

  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<string>("");

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItemDTO[]>([]);

  const canSave = useMemo(() => {
    if (!form.name.trim()) return false;
    if (!form.image.trim()) return false;
    const n = Number(form.polling_interval_seconds);
    if (!Number.isFinite(n) || n <= 0) return false;
    return true;
  }, [form]);

  function fillForm(c: ContainerDTO) {
    setForm({
      name: c.name ?? "",
      image: c.image ?? "",
      registry: (c.registry ?? "") as string,
      host: (c.host ?? "") as string,
      enabled: Boolean(c.enabled),
      polling_interval_seconds: String(c.polling_interval_seconds ?? 60),
    });
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/containers/${id}`);
      const c = (res.data?.container ?? res.data) as ContainerDTO;
      setContainer(c);
      fillForm(c);
    } catch (err: any) {
      alert("Erro ao carregar: " + getErrMsg(err));
      navigate("/docker");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(limit = 50) {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(`/containers/${id}/history?limit=${limit}`);
      setHistory(res.data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([load(), loadHistory(50)]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRefresh() {
    if (!id) return;
    setLoading(true);
    try {
      await api.post(`/containers/${id}/actions/refresh`);
      await refreshAll();
      alert("Atualizado");
    } catch (err: any) {
      alert("Erro: " + getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogs() {
    if (!id) return;
    setLogsLoading(true);
    try {
      // LOGS PODEM DEMORAR EM CONTAINERS BARULHENTOS (EX.: SELENIUM)
      // AUMENTA TIMEOUT SÓ NESTA CHAMADA.
      const res = await api.get(`/containers/${id}/logs?tail=500&timeoutMs=120000`, { timeout: 120000 });
      setLogs(res.data?.logs ?? res.data ?? "(sem logs)");
      await loadHistory(50);
    } catch (err: any) {
      alert("Erro: " + getErrMsg(err));
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleRestart() {
    if (!id) return;
    if (!confirm("Deseja reiniciar este container?")) return;

    setLoading(true);
    try {
      const res = await api.post(`/containers/${id}/actions/restart`);
      alert(res.data?.message || "Restart solicitado");
      await loadHistory(50);
    } catch (err: any) {
      alert("Erro: " + getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!id || !container) return;
    if (!canSave) return alert("Preencha Nome, Imagem e Polling corretamente.");

    setLoading(true);
    try {
      // IMPORTANTE:
      // - SE O USUÁRIO LIMPAR registry/host, PRECISAMOS ENVIAR null PARA LIMPAR NO BANCO.
      // - undefined NÃO ALTERA NO BACKEND.
      const payload = {
        name: form.name.trim(),
        image: form.image.trim(),
        registry: form.registry.trim() ? form.registry.trim() : null,
        host: form.host.trim() ? form.host.trim() : null,
        enabled: form.enabled,
        polling_interval_seconds: Number(form.polling_interval_seconds),
      };

      const res = await api.patch(`/containers/${id}`, payload);
      const c = (res.data?.container ?? res.data) as ContainerDTO;

      setContainer(c);
      fillForm(c);
      setEditMode(false);

      alert("Salvo com sucesso");
      await loadHistory(50);
    } catch (err: any) {
      alert("Erro ao salvar: " + getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Deseja realmente excluir este container?")) return;

    setLoading(true);
    try {
      await api.delete(`/containers/${id}`);
      alert("Container excluído");
      navigate("/docker");
    } catch (err: any) {
      alert("Erro ao excluir: " + getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  if (!id) return <div>Id não informado</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalhe do Container</h1>
          {container && (
            <p className="text-sm text-gray-600 mt-2">
              {container.image} {container.registry ? `• ${container.registry}` : ""}{" "}
              {container.host ? `• host: ${container.host}` : ""}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate("/docker")} variant="secondary">
            Voltar
          </Button>

          <Button onClick={handleRefresh} variant="secondary" disabled={loading}>
            Refresh
          </Button>

          <Button onClick={handleRestart} variant="secondary" disabled={loading}>
            Restart
          </Button>

          <Button onClick={handleLogs} variant="secondary" disabled={logsLoading}>
            {logsLoading ? "Buscando..." : "Get Logs"}
          </Button>

          {!editMode ? (
            <Button onClick={() => setEditMode(true)} variant="primary" disabled={!container}>
              Editar
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} variant="primary" disabled={!canSave || loading}>
                Salvar
              </Button>
              <Button
                onClick={() => {
                  if (container) fillForm(container);
                  setEditMode(false);
                }}
                variant="secondary"
                disabled={loading}
              >
                Cancelar
              </Button>
            </>
          )}

          <Button onClick={handleDelete} variant="secondary" disabled={loading}>
            Excluir
          </Button>
        </div>
      </div>

      {(loading || historyLoading) && <Loading />}

      {container && (
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-gray-600">Nome</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={!editMode}
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-gray-600">Imagem</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.image}
                  onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                  disabled={!editMode}
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-gray-600">Registry</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.registry}
                  onChange={(e) => setForm((p) => ({ ...p, registry: e.target.value }))}
                  disabled={!editMode}
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-gray-600">Host</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.host}
                  onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))}
                  disabled={!editMode}
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-gray-600">Polling (segundos)</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.polling_interval_seconds}
                  onChange={(e) => setForm((p) => ({ ...p, polling_interval_seconds: e.target.value }))}
                  disabled={!editMode}
                />
              </label>

              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                  disabled={!editMode}
                />
                <span className="text-sm text-gray-700">Monitoramento habilitado</span>
              </label>
            </div>

            <div className="text-xs text-gray-500">
              <p>Status: {container.status ?? "-"}</p>
              <p>Restarts: {container.restarts ?? 0}</p>
              <p>Last seen: {container.last_seen_at ? new Date(container.last_seen_at).toLocaleString() : "-"}</p>
            </div>
          </div>
        </Card>
      )}

      {!!logs && (
        <Card>
          <h3 className="font-bold mb-2">Logs</h3>
          <pre className="text-xs whitespace-pre-wrap">{logs}</pre>
        </Card>
      )}

      <Card>
        <h3 className="font-bold mb-3">Histórico (atualizações/ações)</h3>

        {history.length === 0 ? (
          <p className="text-sm text-gray-600">Sem histórico.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Nível</th>
                  <th className="px-3 py-2 text-left">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-3 py-2">{new Date(h.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2">{h.level}</td>
                    <td className="px-3 py-2">{h.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
