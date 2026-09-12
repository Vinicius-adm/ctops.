import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KPICard, Card, Button, Loading } from "@/components/Common";
import { ArrowRight, Plus } from "lucide-react";
import { dashboardService, DashboardSummary } from "@/services/dashboard";

function fmtTime(dateIso: string) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function severityIcon(severity: string) {
  const s = (severity || "").toLowerCase();
  if (s === "critical" || s === "high") return "🔴";
  if (s === "medium") return "🟡";
  return "🟢";
}

export function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const canSeeAdmin = useMemo(() => {
    // ADMIN MASTER ENTRA, USER NÃO
    return summary?.scope === "ALL";
  }, [summary]);

  async function loadSummary() {
    setLoading(true);
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || "Erro ao carregar dashboard");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const jobs = summary?.jobs ?? { total: 0, active: 0 };
  const containers = summary?.containers ?? { total: 0, running: 0, stopped: 0, other: 0 };
  const apis = summary?.apis ?? { total: 0, up: 0, down: 0, unknown: 0 };
  const dbs = summary?.databases ?? { total: 0, healthy: 0, unhealthy: 0, unknown: 0 };
  const agents = summary?.agents ?? { total: 0, healthy: 0, unhealthy: 0, unknown: 0 };
  const incidents = summary?.incidents ?? { open: 0, recent: [] };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Command Center</h1>
          <p className="text-gray-600 mt-2">
            {summary?.scope === "ALL"
              ? "Visão Master: todos os recursos"
              : "Visão do usuário: somente seus recursos cadastrados"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadSummary}>
            Atualizar
          </Button>
        </div>
      </div>

      {loading && <Loading />}

      {/* KPI Cards - Dados reais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div onClick={() => navigate("/jobs")} className="cursor-pointer hover:scale-105 transition-transform">
          <KPICard title="Automações" value={jobs.total} icon="⚙️" color="green" trend={0} />
        </div>

        <div onClick={() => navigate("/docker")} className="cursor-pointer hover:scale-105 transition-transform">
          <KPICard title="Containers" value={containers.total} icon="🐳" color="blue" trend={0} />
        </div>

        <div onClick={() => navigate("/apis")} className="cursor-pointer hover:scale-105 transition-transform">
          <KPICard title="APIs" value={apis.total} icon="🔌" color="green" trend={0} />
        </div>

        <div onClick={() => navigate("/databases")} className="cursor-pointer hover:scale-105 transition-transform">
          <KPICard title="Bancos" value={dbs.total} icon="🗄️" color="green" trend={0} />
        </div>

        <div onClick={() => navigate("/agents")} className="cursor-pointer hover:scale-105 transition-transform">
          <KPICard title="Agentes" value={agents.total} icon="🤖" color="green" trend={0} />
        </div>
      </div>

      {/* Status Details Grid (reais) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card
          className="text-center cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500"
          onClick={() => navigate("/jobs")}
        >
          <p className="text-sm text-gray-600 font-semibold mb-3">Automações</p>
          <div className="flex justify-center space-x-6 mb-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{jobs.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{jobs.active}</p>
              <p className="text-xs text-gray-500">Ativas</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/jobs")}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center mx-auto"
          >
            Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </Card>

        <Card
          className="text-center cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
          onClick={() => navigate("/docker")}
        >
          <p className="text-sm text-gray-600 font-semibold mb-3">Containers</p>
          <div className="flex justify-center space-x-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-green-600">{containers.running}</p>
              <p className="text-xs text-gray-500">Running</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{containers.stopped}</p>
              <p className="text-xs text-gray-500">Stopped</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{containers.other}</p>
              <p className="text-xs text-gray-500">Outros</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/docker")}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center mx-auto"
          >
            Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </Card>

        <Card
          className="text-center cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500"
          onClick={() => navigate("/apis")}
        >
          <p className="text-sm text-gray-600 font-semibold mb-3">APIs</p>
          <div className="flex justify-center space-x-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-green-600">{apis.up}</p>
              <p className="text-xs text-gray-500">Up</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{apis.down}</p>
              <p className="text-xs text-gray-500">Down</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{apis.unknown}</p>
              <p className="text-xs text-gray-500">N/A</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/apis")}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center mx-auto"
          >
            Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </Card>

        <Card
          className="text-center cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500"
          onClick={() => navigate("/databases")}
        >
          <p className="text-sm text-gray-600 font-semibold mb-3">Bancos</p>
          <div className="flex justify-center space-x-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-green-600">{dbs.healthy}</p>
              <p className="text-xs text-gray-500">OK</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{dbs.unhealthy}</p>
              <p className="text-xs text-gray-500">Erro</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{dbs.unknown}</p>
              <p className="text-xs text-gray-500">N/A</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/databases")}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center mx-auto"
          >
            Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </Card>

        <Card
          className="text-center cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500"
          onClick={() => navigate("/agents")}
        >
          <p className="text-sm text-gray-600 font-semibold mb-3">Agentes</p>
          <div className="flex justify-center space-x-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-green-600">{agents.healthy}</p>
              <p className="text-xs text-gray-500">OK</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{agents.unhealthy}</p>
              <p className="text-xs text-gray-500">Erro</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{agents.unknown}</p>
              <p className="text-xs text-gray-500">N/A</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/agents")}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center mx-auto"
          >
            Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-blue-600" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Button onClick={() => navigate("/jobs")} variant="primary" className="w-full h-12 flex items-center justify-center font-semibold">
            ➕ Automação
          </Button>
          <Button onClick={() => navigate("/apis")} variant="primary" className="w-full h-12 flex items-center justify-center font-semibold">
            ➕ API
          </Button>
          <Button onClick={() => navigate("/databases")} variant="primary" className="w-full h-12 flex items-center justify-center font-semibold">
            ➕ Banco
          </Button>
          <Button onClick={() => navigate("/agents")} variant="primary" className="w-full h-12 flex items-center justify-center font-semibold">
            ➕ Agente
          </Button>
          <Button onClick={() => navigate("/docker")} variant="primary" className="w-full h-12 flex items-center justify-center font-semibold">
            🐳 Containers
          </Button>
        </div>
      </Card>

      {/* Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-red-500" onClick={() => navigate("/incidents")}>
          <h3 className="font-bold text-gray-900 mb-2">⚠️ Incidentes</h3>
          <p className="text-sm text-gray-600 mb-3">Incidentes abertos: {incidents.open}</p>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
            Ir para Incidentes <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-yellow-500" onClick={() => navigate("/alerts")}>
          <h3 className="font-bold text-gray-900 mb-2">🔔 Alertas</h3>
          <p className="text-sm text-gray-600 mb-3">Gerenciar regras e notificações</p>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
            Ir para Alertas <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </Card>

        <Card
          className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${canSeeAdmin ? "border-purple-500" : "border-gray-300 opacity-60"}`}
          onClick={() => {
            if (!canSeeAdmin) return;
            navigate("/admin");
          }}
        >
          <h3 className="font-bold text-gray-900 mb-2">⚙️ Administração</h3>
          <p className="text-sm text-gray-600 mb-3">
            {canSeeAdmin ? "Gerenciar usuários e sistema" : "Disponível apenas para conta Master"}
          </p>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center" disabled={!canSeeAdmin}>
            Ir para Admin <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </Card>
      </div>

      {/* Incidentes recentes (reais) */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">🔴 Incidentes Recentes</h2>
          <button
            onClick={() => navigate("/incidents")}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
          >
            Ver Todos <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        {incidents.recent.length === 0 ? (
          <div className="text-sm text-gray-600">Sem incidentes registrados para este escopo.</div>
        ) : (
          <div className="space-y-3">
            {incidents.recent.map((incident) => (
              <div
                key={incident.id}
                onClick={() => navigate("/incidents")}
                className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{severityIcon(incident.severity)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{incident.title}</p>
                      <p className="text-xs text-gray-500">{fmtTime(incident.created_at)}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
