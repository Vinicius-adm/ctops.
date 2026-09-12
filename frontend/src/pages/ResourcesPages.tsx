import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Badge, EmptyState, Loading } from "@/components/Common";
import { validateHost, getHostExamples } from "@/utils/host";
import { Plus, Search, Trash2, Edit2, RefreshCcw, PlugZap} from "lucide-react";

import type { DatabaseDTO } from "@/services/databases";
import { databasesService } from "@/services/databases";
import { apisService, type ApiDTO } from "@/services/apis";
import { containersService } from "@/services/containers";
import { dashboardService, type DashboardSummary } from "@/services/dashboard";

// ==================== HELPERS (SEM ANY) ====================
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (typeof err === "object" && err !== null) {
    const e = err as { response?: { data?: unknown } };
    const data = e.response?.data;

    if (typeof data === "object" && data !== null) {
      const d = data as { error?: unknown; message?: unknown };
      if (typeof d.error === "string" && d.error.trim()) return d.error;
      if (typeof d.message === "string" && d.message.trim()) return d.message;
    }
  }

  return "Desconhecido";
}

// ==================== TYPES ====================
type HealthStatus = "ok" | "error";
type BadgeVariant = "success" | "error" | "warning" | "info";

interface Agent {
  id: string;
  name: string;
  status: HealthStatus;
  latency: number;
  errors: number;
}

interface ContainerItem {
  id: string;
  name: string;
  image: string;
  status?: string;
  last_seen_at?: string;
}

interface Incident {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  status: "open" | "resolved";
  created: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
}
type UserRole = "ADMIN_MASTER" | "USER" | string;

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}


// TIPOS PRA RESPOSTAS DO SERVICE (SEM ANY)
type ContainerRefreshResponse = { warning?: string };
type ContainerLogsResponse = { logs?: string; warning?: string } | string;
type ListContainersResponse = { containers?: unknown[] };

// ==================== DATABASES ====================
export function DatabasesPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<DatabaseDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "PostgreSQL",
    host: "",
    port: "5432",
    database_name: "",
    description: "",
  });

  function renderHealthBadge(db: DatabaseDTO) {
    if (db.is_healthy === true) return <Badge label="SAUDÁVEL" variant="success" />;
    if (db.is_healthy === false) return <Badge label="COM FALHA" variant="error" />;
    return <Badge label="SEM STATUS" variant="info" />;
  }

  async function load() {
    try {
      setLoading(true);
      const list = await databasesService.list();
      setDatabases(list ?? []);
    } catch (err: unknown) {
      alert("Erro ao carregar bancos: " + getErrorMessage(err));
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // ✅ AUTO REFRESH DA LISTA (30s) PRA PEGAR O CHECK AUTOMÁTICO DO BACKEND (1x/H)
    const t = setInterval(() => {
      load();
    }, 30_000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return databases;
    return databases.filter((db) => {
      const hay = `${db.name} ${db.type} ${db.host} ${db.port} ${db.database_name}`.toLowerCase();
      return hay.includes(t);
    });
  }, [databases, searchTerm]);

  function openCreate() {
    setEditId(null);
    setForm({
      name: "",
      type: "PostgreSQL",
      host: "",
      port: "5432",
      database_name: "",
      description: "",
    });
    setModalOpen(true);
  }

  function openEdit(db: DatabaseDTO) {
    setEditId(db.id);
    setForm({
      name: db.name ?? "",
      type: db.type ?? "PostgreSQL",
      host: db.host ?? "",
      port: String(db.port ?? "5432"),
      database_name: db.database_name ?? "",
      description: (db.description ?? "") as string,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    const type = form.type.trim();
    const host = form.host.trim();
    const database_name = form.database_name.trim();
    const port = Number(form.port);

    if (!name || !type || !host || !database_name || !Number.isFinite(port) || port <= 0) {
      alert("Preencha corretamente: Nome, Tipo, Host, Porta e Database.");
      return;
    }

    try {
      setLoading(true);

      if (!editId) {
        await databasesService.create({
          name,
          type,
          host,
          port,
          database_name,
          description: form.description?.trim() ? form.description.trim() : undefined,
        });
        alert("Banco criado com sucesso.");
      } else {
        await databasesService.update(editId, {
          name,
          type,
          host,
          port,
          database_name,
          description: form.description?.trim() ? form.description.trim() : undefined,
        });
        alert("Banco atualizado com sucesso.");
      }

      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      alert("Erro ao salvar: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este banco?")) return;

    try {
      setLoading(true);
      await databasesService.remove(id);
      alert("Banco excluído com sucesso.");
      await load();
    } catch (err: unknown) {
      alert("Erro ao excluir: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDetails(id: string) {
    navigate(`/databases/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bancos de Dados</h1>
          <p className="text-gray-600 mt-2">Cadastro e gestão de conexões (com status automático)</p>
        </div>

        <Button onClick={openCreate} variant="primary" className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Novo Banco</span>
        </Button>
      </div>

      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, host, tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </Card>

      {loading && <Loading />}

      {!loading && filtered.length === 0 ? (
        <EmptyState title="Nenhum banco encontrado" description="Adicione um banco para começar" icon="🗄️" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((db) => (
            <Card key={db.id} className="border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{db.name}</h3>
                  <p className="text-sm text-gray-600">{db.type}</p>
                </div>

                {renderHealthBadge(db)}
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <span className="text-gray-500">Host:</span> {db.host}:{db.port}
                </p>
                <p>
                  <span className="text-gray-500">DB:</span> {db.database_name}
                </p>
              </div>

              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>Atualizado: {db.updated_at ? new Date(db.updated_at).toLocaleString() : "-"}</p>
                <p>Último check: {db.last_check_at ? new Date(db.last_check_at).toLocaleString() : "-"}</p>

                {db.is_healthy === false && db.error_message ? (
                  <p className="text-red-700">
                    Erro: <span className="font-semibold">{db.error_message}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleOpenDetails(db.id)}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-blue-600 hover:bg-blue-50 rounded"
                  aria-label={`Ver detalhes do banco ${db.name}`}
                  title="Detalhes"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Detalhes</span>
                </button>

                <button
                  onClick={() => openEdit(db)}
                  className="p-2 text-gray-700 hover:bg-gray-50 rounded"
                  aria-label={`Editar banco ${db.name}`}
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(db.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  aria-label={`Excluir banco ${db.name}`}
                  title="Excluir banco"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[780px] max-w-[95vw] p-6">
            <h3 className="font-bold text-lg mb-4">{editId ? "Editar Banco" : "Novo Banco"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-gray-600">Nome</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Production DB"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-gray-600">Tipo</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  placeholder="PostgreSQL | MySQL | SQLServer | MongoDB..."
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-gray-600">Host</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.host}
                  onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))}
                  placeholder="db.company.com"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-gray-600">Porta</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.port}
                  onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
                  placeholder="5432"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-gray-600">Database</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.database_name}
                  onChange={(e) => setForm((p) => ({ ...p, database_name: e.target.value }))}
                  placeholder="nome_do_banco"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-gray-600">Descrição (opcional)</span>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg min-h-[90px]"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={loading}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== AGENTS ====================
export function AgentsPage() {
  const navigate = useNavigate();

  const [agents, setAgents] = useState<Agent[]>([
    { id: "1", name: "NLP Agent", status: "ok", latency: 120, errors: 0 },
    { id: "2", name: "Vision Agent", status: "ok", latency: 280, errors: 2 },
    { id: "3", name: "Translation Agent", status: "error", latency: 0, errors: 5 },
  ]);

  function handleCreateAgent() {
    const name = prompt("Nome do novo agente");
    if (!name?.trim()) return;

    const newAgent: Agent = {
      id: Date.now().toString(),
      name: name.trim(),
      status: "ok",
      latency: 0,
      errors: 0,
    };

    setAgents((prev) => [newAgent, ...prev]);
  }

  function handleOpenAgent(id: string) {
    navigate(`/agents/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agentes IA</h1>
          <p className="text-gray-600 mt-2">Monitoramento de agentes de IA</p>
        </div>

        <Button onClick={handleCreateAgent} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="border">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-gray-900">{agent.name}</h3>
              <Badge label={agent.status} variant={agent.status === "ok" ? "success" : "error"} />
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-600">Latência</p>
                <p className="text-lg font-bold">{agent.latency}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Erros</p>
                <p className="text-lg font-bold text-red-600">{agent.errors}</p>
              </div>
            </div>

            <button
              onClick={() => handleOpenAgent(agent.id)}
              className="w-full mt-4 p-2 text-blue-600 hover:bg-blue-50 rounded"
              aria-label={`Ver detalhes do agente ${agent.name}`}
              title="Ver detalhes"
            >
              Ver Detalhes →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== DOCKER ====================
export function DockerPage() {
  const navigate = useNavigate();

  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [logsOpen, setLogsOpen] = useState(false);
  const [logsContent, setLogsContent] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    image: "",
    host: "",
  });

  const filteredContainers = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return containers;
    return containers.filter((c) => {
      const hay = `${c.name} ${c.image} ${c.status ?? ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [containers, searchTerm]);

  function renderStatusBadge(c: ContainerItem) {
  const s = (c.status ?? "unknown").toLowerCase();

  if (s.includes("running") || s === "up") return <Badge label="RODANDO" variant="success" />;
  if (s.includes("paused")) return <Badge label="PAUSADO" variant="warning" />;

  if (
    s.includes("exited") ||
    s.includes("stopped") ||
    s.includes("dead") ||
    s.includes("down")
  ) {
    return <Badge label="PARADO" variant="secondary" />;
  }

  return <Badge label={String(c.status ?? "UNKNOWN").toUpperCase()} variant="error" />;
}

  async function load() {
    try {
      setLoading(true);
      const svc = (await import("@/services/containers")).containersService;
      const res = (await svc.listContainers()) as ListContainersResponse;

      const raw = Array.isArray(res?.containers) ? res.containers : [];

      const list: ContainerItem[] = raw.map((c) => {
        const obj = (typeof c === "object" && c !== null ? (c as Record<string, unknown>) : {}) as Record<
          string,
          unknown
        >;

        const id = String(obj.id ?? obj.container_id ?? "");
        const name = String(obj.name ?? (Array.isArray(obj.names) ? obj.names[0] : undefined) ?? obj.container_name ?? "-");
        const image = String(obj.image ?? obj.image_name ?? "-");
        const status = obj.status ? String(obj.status).toLowerCase() : undefined;
        const last_seen_at = (obj.last_seen_at ?? obj.updated_at) as string | undefined;

        return { id, name, image, status, last_seen_at };
      });

      setContainers(list);
    } catch (err: unknown) {
      alert("Erro ao carregar containers: " + getErrorMessage(err));
      setContainers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm({ name: "", image: "", host: "" });
    setModalOpen(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    const image = form.image.trim();
    const host = form.host.trim();

    if (!name || !image) {
      alert("Nome e imagem são obrigatórios");
      return;
    }

    if (host) {
      const vh = validateHost(host);
      if (!vh.valid) {
        alert("Host inválido: " + vh.message + "\nExemplos: " + getHostExamples().join(" | "));
        return;
      }
    }

    try {
      setLoading(true);
      const svc = (await import("@/services/containers")).containersService;

      const createRes = (await svc.createContainer({
        name,
        image,
        host: host ? host : undefined,
      })) as { warning?: string };

      setModalOpen(false);
      if (createRes?.warning) alert("Container criado com sucesso — Aviso: " + createRes.warning);
      else alert("Container criado com sucesso");

      await load();
    } catch (err: unknown) {
      alert("Erro ao criar container: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    openCreate();
  }

  async function handleRefresh(id: string) {
    try {
      setLoading(true);
      const svc = (await import("@/services/containers")).containersService;

      const res = (await svc.refreshContainer(id)) as ContainerRefreshResponse;

      await load();
      if (res?.warning) alert("Status atualizado — Aviso: " + res.warning);
      else alert("Status atualizado");
    } catch (err: unknown) {
      alert("Erro ao atualizar: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogs(id: string) {
    try {
      setLoading(true);
      const svc = (await import("@/services/containers")).containersService;

      const res = (await svc.getContainerLogs(id, 200)) as ContainerLogsResponse;

      const logs = typeof res === "string" ? res : String(res?.logs ?? "");
      setLogsContent(logs || "(sem logs)");
      setLogsOpen(true);

      if (typeof res === "object" && res && "warning" in res) {
        const w = (res as { warning?: unknown }).warning;
        if (typeof w === "string" && w.trim()) {
          alert(
            "Aviso: " + w + "\nSe os logs não aparecem, configure o host do Docker para este container."
          );
        }
      }
    } catch (err: unknown) {
      alert("Erro ao buscar logs: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestart(id: string) {
    try {
      setLoading(true);
      const svc = (await import("@/services/containers")).containersService;
      const res = (await svc.refreshContainer(id)) as ContainerRefreshResponse;

      await load();
      if (res?.warning) alert("Container atualizado — Aviso: " + res.warning);
      else alert("Container atualizado");
    } catch (err: unknown) {
      alert("Erro ao reiniciar: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja remover este container?")) return;

    try {
      setLoading(true);
      const svc = (await import("@/services/containers")).containersService;
      await svc.deleteContainer(id);

      alert("Container removido");
      await load();
    } catch (err: unknown) {
      alert("Erro ao remover: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const running = useMemo(
    () => containers.filter((c) => (c.status ?? "").toLowerCase() === "running").length,
    [containers]
  );
  const stopped = useMemo(
    () => containers.filter((c) => c.status && (c.status ?? "").toLowerCase() !== "running").length,
    [containers]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Docker Containers</h1>
          <p className="text-gray-600 mt-2">Gerenciamento de containers</p>
        </div>

        <Button onClick={handleCreate} variant="primary">
          ➕ Adicionar Container
        </Button>
      </div>

      <Card>
        <h2 className="font-bold mb-4">Resumo</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-600">{running}</p>
            <p className="text-sm text-gray-600">Rodando</p>
          </div>

          <div className="text-center p-4 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-600">{stopped}</p>
            <p className="text-sm text-gray-600">Parado</p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-gray-600">{containers.length}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
        </div>
      </Card>

      
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, imagem, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </Card>

      <div>
        {loading && <Loading />}

        {!loading && filteredContainers.length === 0 && (
          <EmptyState title="Nenhum container" description="Nenhum container encontrado com esse filtro" icon="🐳" />
        )}

        {!loading && filteredContainers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContainers.map((c) => (
              <Card key={c.id} className="border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                    <p className="text-sm text-gray-600">{c.image}</p>
                  </div>

                  {renderStatusBadge(c)}
                </div>

                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <p>Status: {c.status ?? "-"}</p>
                  <p>Último sinal: {c.last_seen_at ? new Date(c.last_seen_at).toLocaleString() : "-"}</p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/containers/${c.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 p-2 text-blue-600 hover:bg-blue-50 rounded"
                    aria-label={`Ver detalhes do container ${c.name}`}
                    title="Detalhes"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Detalhes</span>
                  </button>

                  <button
                    onClick={() => handleRestart(c.id)}
                    className="p-2 text-gray-700 hover:bg-gray-50 rounded"
                    aria-label={`Reiniciar container ${c.name}`}
                    title="Reiniciar"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleLogs(c.id)}
                    className="p-2 text-gray-700 hover:bg-gray-50 rounded"
                    aria-label={`Ver logs do container ${c.name}`}
                    title="Logs"
                  >
                    <PlugZap className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    aria-label={`Excluir container ${c.name}`}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {logsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-3/4 max-h-3/4 overflow-auto p-6">
            <h3 className="font-bold text-lg mb-4">Logs</h3>
            <pre className="text-xs whitespace-pre-wrap">{logsContent}</pre>

            <div className="mt-4 text-right">
              <Button onClick={() => setLogsOpen(false)} variant="secondary">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[780px] max-w-[95vw] p-6">
            <h3 className="font-bold text-lg mb-4">Novo Container</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-gray-600">Nome do Container</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: my-nginx"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-gray-600">Imagem</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.image}
                  onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                  placeholder="Ex: nginx:latest"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-gray-600">Host Docker (opcional)</span>
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.host}
                  onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))}
                  placeholder="Ex: /var/run/docker.sock ou tcp://host:2375"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={loading}>
                {loading ? "Salvando..." : "Criar Container"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== INCIDENTS ====================
export function IncidentsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [apis, setApis] = useState<ApiDTO[]>([]);
  const [databases, setDatabases] = useState<DatabaseDTO[]>([]);
  const [containers, setContainers] = useState<ContainerItem[]>([]);

  async function loadAll() {
    try {
      setLoading(true);

      const [s, apisList, dbList, cList] = await Promise.all([
        dashboardService.getSummary().catch(() => null),
        apisService.list().catch(() => []),
        databasesService.list().catch(() => []),
        containersService.listContainers().catch(() => ({ containers: [] } as any)),
      ]);

      setSummary(s);
      setApis(apisList ?? []);
      setDatabases(dbList ?? []);

      const raw = (cList as any)?.containers ?? [];
      // NORMALIZA PARA O TIPO USADO NA UI
      const normalized: ContainerItem[] = Array.isArray(raw)
        ? raw.map((x: any) => ({
            id: String(x.id ?? x.Id ?? x.container_id ?? ""),
            name: String(x.name ?? x.Nome ?? x.container_name ?? ""),
            image: String(x.image ?? x.Image ?? ""),
            status: String(x.status ?? x.Status ?? x.state ?? ""),
            last_seen_at: x.last_seen_at ? String(x.last_seen_at) : undefined,
          }))
        : [];

      setContainers(normalized);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const t = setInterval(() => loadAll(), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apisDown = useMemo(() => apis.filter((a) => a.is_up === false), [apis]);
  const dbUnhealthy = useMemo(() => databases.filter((d) => d.is_healthy === false), [databases]);
  const containersBad = useMemo(() => {
    return containers.filter((c) => {
      const s = (c.status ?? "").toLowerCase();
      if (!s) return false;
      if (s.includes("running") || s === "up") return false;
      return true;
    });
  }, [containers]);

  const problemsCount =
    apisDown.length + dbUnhealthy.length + containersBad.length + (summary?.incidents?.open ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Incidentes</h1>
        <p className="text-gray-600 mt-2">
          Visão geral de problemas (API, Banco e Docker) + incidentes abertos
        </p>
      </div>

      {loading && <Loading />}

      {/* RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border">
          <p className="text-xs text-gray-600">Problemas totais</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{problemsCount}</p>
        </Card>
        <Card className="border">
          <p className="text-xs text-gray-600">APIs offline</p>
          <p className="text-3xl font-bold mt-2">{apisDown.length}</p>
        </Card>
        <Card className="border">
          <p className="text-xs text-gray-600">Bancos com falha</p>
          <p className="text-3xl font-bold mt-2">{dbUnhealthy.length}</p>
        </Card>
        <Card className="border">
          <p className="text-xs text-gray-600">Containers com problema</p>
          <p className="text-3xl font-bold mt-2">{containersBad.length}</p>
        </Card>
      </div>

      {/* INCIDENTES RECENTES (BACKEND) */}
      <Card className="border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Incidentes recentes</h3>
            <p className="text-sm text-gray-600">Abertos: {summary?.incidents?.open ?? 0}</p>
          </div>
          <Button variant="secondary" onClick={() => loadAll()}>Atualizar</Button>
        </div>

        <div className="mt-4 space-y-2">
          {(summary?.incidents?.recent ?? []).length === 0 ? (
            <EmptyState title="Sem incidentes" description="Nenhum incidente recente encontrado." />
          ) : (
            (summary?.incidents?.recent ?? []).map((it) => (
              <div key={it.id} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{it.title}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(it.created_at).toLocaleString("pt-BR")} • {String(it.severity).toUpperCase()} • {String(it.status).toUpperCase()}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => navigate(`/incidents/${it.id}`)}>
                  Ver
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* APIs OFFLINE */}
      <Card className="border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">APIs offline ({apisDown.length})</h3>
          <Button variant="secondary" onClick={() => navigate("/apis")}>Abrir APIs</Button>
        </div>

        <div className="mt-4 space-y-2">
          {apisDown.length === 0 ? (
            <EmptyState title="Tudo certo" description="Nenhuma API marcada como offline." />
          ) : (
            apisDown.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{a.name}</p>
                  <p className="text-xs text-gray-600 truncate">{a.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="OFFLINE" variant="error" />
                  <Button variant="secondary" onClick={() => navigate(`/apis/${a.id}`)}>Detalhes</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* BANCOS COM FALHA */}
      <Card className="border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Bancos com falha ({dbUnhealthy.length})</h3>
          <Button variant="secondary" onClick={() => navigate("/databases")}>Abrir Bancos</Button>
        </div>

        <div className="mt-4 space-y-2">
          {dbUnhealthy.length === 0 ? (
            <EmptyState title="Tudo certo" description="Nenhum banco marcado como com falha." />
          ) : (
            dbUnhealthy.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{d.name}</p>
                  <p className="text-xs text-gray-600 truncate">
                    {d.type} • {d.host}:{d.port} • {d.database_name}
                  </p>
                  {d.error_message ? (
                    <p className="text-xs text-red-700 mt-1 truncate">{d.error_message}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="FALHA" variant="error" />
                  <Button variant="secondary" onClick={() => navigate(`/databases/${d.id}`)}>Detalhes</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* DOCKER PROBLEMAS */}
      <Card className="border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Docker com problema ({containersBad.length})</h3>
          <Button variant="secondary" onClick={() => navigate("/docker")}>Abrir Docker</Button>
        </div>

        <div className="mt-4 space-y-2">
          {containersBad.length === 0 ? (
            <EmptyState title="Tudo certo" description="Nenhum container marcado como parado/erro." />
          ) : (
            containersBad.map((c) => (
              <div key={`${c.id}-${c.name}`} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-600 truncate">{c.image}</p>
                  <p className="text-xs text-gray-600 mt-1">Status: <span className="font-semibold">{String(c.status ?? "UNKNOWN")}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="PROBLEMA" variant="warning" />
                  <Button variant="secondary" onClick={() => navigate(`/containers/${encodeURIComponent(c.id)}`)}>Detalhes</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// ==================== ALERTS ====================
export function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([
    { id: "1", name: "API Down Alert", condition: "api.is_up == false", enabled: true },
    { id: "2", name: "High CPU", condition: "cpu > 80%", enabled: true },
    { id: "3", name: "Disk Full", condition: "disk > 90%", enabled: false },
  ]);

  function handleCreateRule() {
    const name = prompt("Nome da nova regra");
    const condition = prompt("Condição da regra (ex: cpu > 80%)");

    if (!name?.trim() || !condition?.trim()) return;

    const newRule: AlertRule = {
      id: Date.now().toString(),
      name: name.trim(),
      condition: condition.trim(),
      enabled: true,
    };

    setRules((prev) => [newRule, ...prev]);
  }

  function handleEditRule(id: string) {
    const name = prompt("Novo nome para a regra");
    if (!name?.trim()) return;

    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, name: name.trim() } : r)));
  }

  function handleToggleRule(id: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Regras de Alerta</h1>
          <p className="text-gray-600 mt-2">Gerenciamento de alertas</p>
        </div>

        <Button onClick={handleCreateRule} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{rule.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{rule.condition}</p>
              </div>

              <div className="flex items-center gap-4">
                <Badge label={rule.enabled ? "Ativo" : "Inativo"} variant={rule.enabled ? "success" : "warning"} />

                <button
                  onClick={() => handleEditRule(rule.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  aria-label={`Editar regra ${rule.name}`}
                  title="Editar regra"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                  aria-label={rule.enabled ? `Desativar regra ${rule.name}` : `Ativar regra ${rule.name}`}
                  title={rule.enabled ? "Desativar" : "Ativar"}
                >
                  {rule.enabled ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== ADMIN PANEL ====================
export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([
    { id: "1", email: "master@ctops.com", name: "Master Admin", role: "ADMIN_MASTER", active: true },
    { id: "2", email: "user@ctops.com", name: "Regular User", role: "USER", active: true },
    { id: "3", email: "disabled@ctops.com", name: "Disabled User", role: "USER", active: false },
  ]);

  function handleEditUser(id: string) {
    const name = prompt("Novo nome do usuário");
    if (!name?.trim()) return;

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, name: name.trim() } : u)));
  }

  function handleToggleUserActive(id: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administração</h1>
          <p className="text-gray-600 mt-2">Gerenciamento de usuários e sistema</p>
        </div>

        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <h2 className="text-lg font-bold mb-4">Usuários</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Role</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-right text-sm font-medium">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4 text-sm">{user.name}</td>

                  <td className="px-6 py-4 text-sm">
                    <Badge label={user.role} variant={user.role === "ADMIN_MASTER" ? "error" : "info"} />
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <Badge label={user.active ? "Ativo" : "Inativo"} variant={user.active ? "success" : "warning"} />
                  </td>

                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEditUser(user.id)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      aria-label={`Editar usuário ${user.email}`}
                      title="Editar usuário"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleToggleUserActive(user.id)}
                      className="text-red-600 hover:text-red-800"
                      aria-label={user.active ? `Desativar usuário ${user.email}` : `Ativar usuário ${user.email}`}
                      title={user.active ? "Desativar" : "Ativar"}
                    >
                      {user.active ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
