import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Button, Badge, Loading, EmptyState } from "@/components/Common";
import {
  databasesService,
  DatabaseDTO,
  UpdateDatabasePayload,
  DatabaseTestResult,
  DatabaseHealthItemDTO,
} from "@/services/databases";
import { ArrowLeft, Edit2, Save, Trash2, X, PlugZap, RefreshCcw } from "lucide-react";

type FormState = {
  name: string;
  type: string;
  host: string;
  port: string;
  database_name: string;
  description: string;
};

function toForm(db: DatabaseDTO): FormState {
  return {
    name: db.name ?? "",
    type: db.type ?? "",
    host: db.host ?? "",
    port: String(db.port ?? ""),
    database_name: db.database_name ?? "",
    description: (db.description ?? "") as string,
  };
}

function getErrMsg(err: unknown): string {
  const e = err as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || "Desconhecido";
}

export default function DatabaseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [db, setDb] = useState<DatabaseDTO | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<DatabaseTestResult | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<DatabaseHealthItemDTO[]>([]);

  const [form, setForm] = useState<FormState>({
    name: "",
    type: "",
    host: "",
    port: "",
    database_name: "",
    description: "",
  });

  const canSave = useMemo(() => {
    if (!form.name.trim()) return false;
    if (!form.type.trim()) return false;
    if (!form.host.trim()) return false;
    const p = Number(form.port);
    if (!Number.isFinite(p) || p <= 0) return false;
    if (!form.database_name.trim()) return false;
    return true;
  }, [form]);

  async function loadDb() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await databasesService.get(id);
      setDb(data);
      setForm(toForm(data));
    } catch (err: unknown) {
      alert("Erro ao carregar banco: " + getErrMsg(err));
      navigate("/databases");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(limit = 50) {
    if (!id) return;
    try {
      setHistoryLoading(true);
      const list = await databasesService.health(id, limit);
      setHistory(list ?? []);
    } catch (err: unknown) {
      // histórico não pode derrubar a tela
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadDb(), loadHistory(50)]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✅ AUTO REFRESH DA TELA (30s) PRA REFLETIR CHECK DO BACKEND
  useEffect(() => {
    const t = setInterval(() => {
      refreshAll();
    }, 30_000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✅ AUTO TEST 1x/h (sem clicar) -> chama endpoint /test (TCP)
  // OBS: isso é extra (o "certo" é o backend rodar sozinho). Mas você pediu auto aqui também.
  useEffect(() => {
    if (!id) return;

    const run = async () => {
      try {
        setTestLoading(true);
        setTestResult(null);
        const result = await databasesService.test(id, 3000);
        setTestResult(result);
      } catch (err: unknown) {
        setTestResult({
          ok: false,
          latency_ms: 0,
          message: "Falha ao testar conexão",
          error: getErrMsg(err),
        });
      } finally {
        setTestLoading(false);
      }
    };

    run(); // roda ao entrar na tela
    const t = setInterval(run, 60 * 60 * 1000); // 1 hora
    return () => clearInterval(t);
  }, [id]);

  async function handleSave() {
    if (!id) return;
    if (!canSave) {
      alert("Preencha os campos obrigatórios corretamente.");
      return;
    }

    try {
      setLoading(true);

      const payload: UpdateDatabasePayload = {
        name: form.name.trim(),
        type: form.type.trim(),
        host: form.host.trim(),
        port: Number(form.port),
        database_name: form.database_name.trim(),
        description: form.description?.trim() ? form.description.trim() : undefined,
      };

      const updated = await databasesService.update(id, payload);
      setDb(updated);
      setForm(toForm(updated));
      setEditMode(false);
      alert("Banco atualizado com sucesso.");

      await refreshAll();
    } catch (err: unknown) {
      alert("Erro ao salvar: " + getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Deseja realmente excluir este banco?")) return;

    try {
      setLoading(true);
      await databasesService.remove(id);
      alert("Banco excluído com sucesso.");
      navigate("/databases");
    } catch (err: unknown) {
      alert("Erro ao excluir: " + getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    if (!id) return;

    try {
      setTestLoading(true);
      setTestResult(null);
      const result = await databasesService.test(id, 3000);
      setTestResult(result);
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        latency_ms: 0,
        message: "Falha ao testar conexão",
        error: getErrMsg(err),
      });
    } finally {
      setTestLoading(false);
    }
  }

  if (loading && !db) return <Loading />;

  if (!db) {
    return (
      <Card>
        <EmptyState title="Banco não encontrado" description="Volte para a lista de bancos." icon="🗄️" />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/databases")}>
            Voltar
          </Button>
        </div>
      </Card>
    );
  }

  const healthBadge = () => {
    if (db.is_healthy === true) return <Badge label="SAUDÁVEL" variant="success" />;
    if (db.is_healthy === false) return <Badge label="COM FALHA" variant="error" />;
    return <Badge label="SEM STATUS" variant="info" />;
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/databases")}
        className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Bancos
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">{db.name}</h1>
            {healthBadge()}
          </div>

          <p className="text-gray-600 mt-2">
            {db.type} • {db.host}:{db.port} • {db.database_name}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Último check: {db.last_check_at ? new Date(db.last_check_at).toLocaleString() : "-"}
          </p>

          {db.is_healthy === false && db.error_message ? (
            <p className="text-sm text-red-700 mt-2">
              Erro: <span className="font-semibold">{db.error_message}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Badge label={editMode ? "EDITANDO" : "VISUALIZAÇÃO"} variant={editMode ? "warning" : "info"} />

          <Button variant="secondary" onClick={refreshAll} disabled={loading || historyLoading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>

          <Button variant="secondary" onClick={handleTestConnection} disabled={testLoading || loading}>
            <PlugZap className="w-4 h-4 mr-2" />
            {testLoading ? "Testando..." : "Testar Conexão"}
          </Button>

          {!editMode ? (
            <Button variant="primary" onClick={() => setEditMode(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          ) : (
            <>
              <Button variant="primary" onClick={handleSave} disabled={!canSave || loading}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  setForm(toForm(db));
                }}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </>
          )}

          <Button variant="secondary" onClick={handleDelete} disabled={loading}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {(loading || testLoading || historyLoading) && <Loading />}

      {testResult && (
        <Card className="border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Resultado do Teste</h2>
              <p className="text-sm text-gray-600 mt-1">
                {testResult.host || db.host}:{testResult.port || db.port} • {testResult.type || db.type}
              </p>
            </div>

            <Badge label={testResult.ok ? "OK" : "FALHOU"} variant={testResult.ok ? "success" : "error"} />
          </div>

          <div className="mt-4 text-sm">
            <p className="text-gray-800">{testResult.message || "-"}</p>
            <p className="text-gray-600 mt-2">
              Latência: <span className="font-semibold">{testResult.latency_ms}ms</span>
            </p>

            {!testResult.ok && testResult.error && (
              <p className="text-red-700 mt-2">
                Erro: <span className="font-semibold">{testResult.error}</span>
              </p>
            )}

            <p className="text-xs text-gray-500 mt-3">
              *Teste TCP (reachability). Se precisar validar login/usuário/senha, aí adicionamos drivers por tipo.
            </p>
          </div>
        </Card>
      )}

      <Card className="border">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Histórico (últimos checks)</h2>

        {history.length === 0 ? (
          <EmptyState title="Sem histórico" description="Ainda não há checks salvos." icon="🕒" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Latência (ms)</th>
                  <th className="px-4 py-3 text-left font-medium">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge label={h.ok ? "OK" : "FALHOU"} variant={h.ok ? "success" : "error"} />
                    </td>
                    <td className="px-4 py-3">{h.latency_ms}</td>
                    <td className="px-4 py-3 text-red-700">{h.ok ? "-" : h.error || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Dados do Banco</h2>

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
            <span className="text-sm text-gray-600">Tipo</span>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              disabled={!editMode}
              placeholder="PostgreSQL | MySQL | SQLServer | MongoDB | Redis..."
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-gray-600">Host</span>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.host}
              onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))}
              disabled={!editMode}
              placeholder="localhost | 10.0.0.10 | db.company.com"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-gray-600">Porta</span>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.port}
              onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
              disabled={!editMode}
              placeholder="5432"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-gray-600">Database</span>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.database_name}
              onChange={(e) => setForm((p) => ({ ...p, database_name: e.target.value }))}
              disabled={!editMode}
              placeholder="nome_do_banco"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm text-gray-600">Descrição</span>
            <textarea
              className="w-full px-3 py-2 border rounded-lg min-h-[90px]"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              disabled={!editMode}
              placeholder="Opcional"
            />
          </label>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Criado em: {new Date(db.created_at).toLocaleString()}</p>
          <p>Atualizado em: {new Date(db.updated_at).toLocaleString()}</p>
        </div>
      </Card>
    </div>
  );
}
