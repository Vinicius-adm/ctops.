import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, Button, Badge } from '@/components/Common';
import { apisService, type ApiDTO, type ApiTestResult, type ApiHistoryResponse } from '@/services/apis';
import { ArrowLeft, Edit2, Trash2, Play, Pause, PlugZap, RefreshCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ==================== JOB DETAIL ====================
export function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const initialJob = {
    id,
    name: 'Daily Backup',
    description: 'Backup diário do banco de dados de produção',
    schedule: '0 2 * * *',
    status: 'active',
    last_run_at: '2026-01-06 02:00',
    duration_last_run: 5000,
    total_runs: 156,
    successful_runs: 154,
    failed_runs: 2
  } as any;

  const [jobData, setJobData] = useState(initialJob);

  const [executionHistory, setExecutionHistory] = useState([
    { date: '2026-01-06', status: 'success', duration: 5230 },
    { date: '2026-01-05', status: 'success', duration: 4890 },
    { date: '2026-01-04', status: 'failed', duration: 12300 },
    { date: '2026-01-03', status: 'success', duration: 5100 },
    { date: '2026-01-02', status: 'success', duration: 5050 },
    { date: '2026-01-01', status: 'success', duration: 4950 }
  ] as any[]);

  const [chartData] = useState([
    { time: '00:00', duration: 5100 },
    { time: '04:00', duration: 4900 },
    { time: '08:00', duration: 5200 },
    { time: '12:00', duration: 5000 },
    { time: '16:00', duration: 5150 },
    { time: '20:00', duration: 4950 }
  ] as any[]);

  const successRate = ((jobData.successful_runs / jobData.total_runs) * 100).toFixed(1);

  const handleExecute = async () => {
    // Simula execução e atualiza os KPIs localmente
    setJobData((prev: any) => ({
      ...prev,
      last_run_at: new Date().toISOString(),
      total_runs: prev.total_runs + 1,
      successful_runs: prev.successful_runs + 1,
      duration_last_run: Math.floor(Math.random() * 8000) + 1000
    }));

    setExecutionHistory((prev) => [{ date: new Date().toISOString().split('T')[0], status: 'success', duration: Math.floor(Math.random() * 8000) + 1000 }, ...prev]);
    alert('Execução iniciada (simulada).');
  };

  const handlePause = () => {
    setJobData((prev: any) => ({ ...prev, status: prev.status === 'active' ? 'paused' : 'active' }));
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/jobs')}
        className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Automações
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{jobData.name}</h1>
          <p className="text-gray-600 mt-2">{jobData.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge
            label={jobData.status}
            variant={jobData.status === 'active' ? 'success' : 'warning'}
          />
          <button onClick={() => alert('Editar job (simulado)')} className="p-2 text-blue-600 hover:bg-blue-50 rounded" aria-label="Editar job">
            <Edit2 className="w-5 h-5" />
          </button>
          <button onClick={() => { if(confirm('Deseja excluir este job?')) { alert('Job excluído (simulado)'); } }} className="p-2 text-red-600 hover:bg-red-50 rounded" aria-label="Excluir job">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-600">Schedule</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{jobData.schedule}</p>
          <p className="text-xs text-gray-500 mt-2">Todos os dias às 2am</p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Última Execução</p>
          <p className="text-lg font-bold text-gray-900 mt-2">
            {new Date(jobData.last_run_at).toLocaleTimeString('pt-BR')}
          </p>
          <p className="text-xs text-gray-500 mt-2">{jobData.duration_last_run}ms</p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Taxa de Sucesso</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{successRate}%</p>
          <p className="text-xs text-gray-500 mt-2">{jobData.successful_runs}/{jobData.total_runs}</p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Ações</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleExecute} className="p-2 text-green-600 hover:bg-green-50 rounded flex-1" title="Executar">
              <Play className="w-4 h-4 mx-auto" />
            </button>
            <button onClick={handlePause} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded flex-1" title="Pausar">
              <Pause className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Duração das Execuções</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={(value) => `${value}ms`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="duration"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6' }}
              name="Duração (ms)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Execution History */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Histórico de Execuções</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Data</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Duração</th>
                <th className="px-6 py-3 text-right text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {executionHistory.map((exec: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{exec.date}</td>
                  <td className="px-6 py-4 text-sm">
                    <Badge
                      label={exec.status}
                      variant={exec.status === 'success' ? 'success' : 'error'}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exec.duration}ms</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => alert('Exibindo logs (simulado) para ' + exec.date)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Ver Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => navigate('/jobs')} variant="secondary">
          Voltar
        </Button>
        <Button onClick={() => { alert('Alterações salvas (simulado)'); navigate('/jobs'); }} variant="primary">
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}

// ==================== API DETAIL ====================
export function APIDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loadingApi, setLoadingApi] = useState(false);
  const [apiData, setApiData] = useState<ApiDTO | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [history, setHistory] = useState<ApiHistoryResponse | null>(null);
  const [lastTest, setLastTest] = useState<ApiTestResult | null>(null);

  async function load() {
    if (!id) return;
    try {
      setLoadingApi(true);
      setApiError(null);

      // TENTA GET DIRETO
      try {
        const data = await apisService.get(id);
        setApiData(data);
      } catch (err: any) {
        // FALLBACK: LISTA E ACHA PELO ID (AJUDA QUANDO HÁ PROBLEMA DE ROTEAMENTO/PROXY)
        const list = await apisService.list();
        const found = (list ?? []).find((x) => x.id === id) ?? null;
        setApiData(found);
        setApiError("Não consegui carregar detalhes via /apis/:id. Usando fallback pela lista.");
      }

      // HISTÓRICO (24H)
      try {
        const h = await apisService.history(id, "24h");
        setHistory(h);
      } catch {
        setHistory(null);
      }
    } finally {
      setLoadingApi(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [id]);

  async function handleTestNow() {
    if (!id) return;
    try {
      setLoadingApi(true);
      const r = await apisService.test(id);
      setLastTest(r);
      await load();
    } finally {
      setLoadingApi(false);
    }
  }

  function statusBadge() {
    const up = apiData?.is_up;
    if (up === true) return <Badge label="ONLINE" variant="success" />;
    if (up === false) return <Badge label="OFFLINE" variant="error" />;
    return <Badge label="SEM STATUS" variant="info" />;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/apis")}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para APIs
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900">
            {apiData?.name ?? (loadingApi ? "Carregando..." : "API")}
          </h1>
          <p className="text-gray-600 mt-2">{apiData?.description ?? ""}</p>
          <p className="text-sm text-gray-500 mt-2 break-all">{apiData?.url ?? ""}</p>
        </div>

        <div className="flex items-center gap-3">
          {apiData ? statusBadge() : null}

          <Button onClick={handleTestNow} variant="secondary" className="flex items-center gap-2" disabled={!id}>
            <PlugZap className="w-4 h-4" />
            Testar agora
          </Button>

          <Button onClick={load} variant="secondary" className="flex items-center gap-2" disabled={!id}>
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {apiError ? (
        <Card>
          <p className="text-sm text-red-700">{apiError}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">●</p>
          <p className="text-sm text-gray-500 mt-2">
            {apiData?.is_up === true ? "Online" : apiData?.is_up === false ? "Offline" : "Sem status"}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Latência Atual</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {typeof apiData?.latency_ms === "number" ? `${apiData.latency_ms}ms` : "-"}
          </p>
          <p className="text-sm text-gray-500 mt-2">Última verificação</p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Uptime</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">-</p>
          <p className="text-sm text-gray-500 mt-2">Disponível ao habilitar histórico</p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Última Check</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {apiData?.last_check_at ? new Date(apiData.last_check_at).toLocaleTimeString() : "-"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {apiData?.last_check_at ? new Date(apiData.last_check_at).toLocaleDateString() : "-"}
          </p>
        </Card>
      </div>

      {lastTest ? (
        <Card>
          <p className="text-sm text-gray-600">Resultado do último teste manual</p>
          <div className="mt-2 text-sm text-gray-800">
            <p>
              <span className="text-gray-500">OK:</span> <span className="font-semibold">{String(lastTest.ok)}</span>
            </p>
            <p>
              <span className="text-gray-500">Latência:</span>{" "}
              <span className="font-semibold">{lastTest.latency_ms}ms</span>
            </p>
            {typeof lastTest.status === "number" ? (
              <p>
                <span className="text-gray-500">HTTP:</span> <span className="font-semibold">{lastTest.status}</span>
              </p>
            ) : null}
            {lastTest.error ? (
              <p className="text-red-700">
                Erro: <span className="font-semibold">{lastTest.error}</span>
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-bold text-gray-900">Histórico de Checks (últimas 24h)</h2>

        {!history || history.events.length === 0 ? (
          <p className="text-sm text-gray-600 mt-2">Sem eventos ainda. Rode "Testar agora" ou aguarde o scheduler.</p>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...history.events]
                    .slice()
                    .reverse()
                    .map((e) => ({
                      time: new Date(e.checked_at).toLocaleTimeString(),
                      latency: e.latency_ms,
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="latency" name="Latência (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2">Hora</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">HTTP</th>
                    <th className="py-2">Latência</th>
                    <th className="py-2">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {history.events.slice(0, 50).map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-2">{new Date(e.checked_at).toLocaleTimeString()}</td>
                      <td className="py-2">
                        <Badge label={e.ok ? "success" : "fail"} variant={e.ok ? "success" : "error"} />
                      </td>
                      <td className="py-2">{typeof e.status === "number" ? e.status : "-"}</td>
                      <td className="py-2">{e.latency_ms}ms</td>
                      <td className="py-2 text-red-700">{e.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


// ==================== INCIDENT DETAIL ====================
export function IncidentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const initialIncident = {
    id,
    title: 'API Down',
    severity: 'high',
    status: 'open',
    created_at: '2026-01-06 14:35',
    description: 'A API de pagamento está retornando erro 500',
    affected_services: ['Payment Gateway', 'Checkout', 'Subscriptions'],
    impact: 'Clientes não conseguem fazer pagamentos'
  } as any;

  const [incidentData, setIncidentData] = useState(initialIncident);

  const [timeline, setTimeline] = useState([
    { time: '14:35', action: 'Incidente criado', user: 'Sistema', color: 'red' },
    { time: '14:40', action: 'Equipe notificada', user: 'Automático', color: 'yellow' },
    { time: '15:00', action: 'Início da investigação', user: 'John Doe', color: 'blue' },
    { time: '15:30', action: 'Causa identificada', user: 'John Doe', color: 'blue' }
  ] as any[]);

  const handleMarkResolved = () => {
    setIncidentData((prev: any) => ({ ...prev, status: 'resolved' }));
    setTimeline((prev) => [{ time: new Date().toTimeString().slice(0,5), action: 'Incidente resolvido', user: 'Você', color: 'green' }, ...prev]);
    alert('Incidente marcado como resolvido (simulado).');
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/incidents')}
        className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Incidentes
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{incidentData.title}</h1>
          <p className="text-gray-600 mt-2">{incidentData.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge
            label={incidentData.severity}
            variant={incidentData.severity === 'high' ? 'error' : 'warning'}
          />
          <Badge
            label={incidentData.status}
            variant={incidentData.status === 'open' ? 'warning' : 'success'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-600">Criado em</p>
          <p className="text-lg font-bold text-gray-900 mt-2">
            {new Date(incidentData.created_at).toLocaleTimeString('pt-BR')}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Serviços Afetados</p>
          <div className="mt-2 space-y-1">
            {incidentData.affected_services.map((service: any, idx: number) => (
              <p key={idx} className="text-sm font-medium text-gray-900">
                • {service}
              </p>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm text-gray-600">Impacto</p>
          <p className="text-sm font-medium text-gray-900 mt-2">{incidentData.impact}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-6">Timeline</h2>
        <div className="space-y-4">
          {timeline.map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full bg-${item.color}-500`}></div>
                {idx < timeline.length - 1 && <div className="w-0.5 h-12 bg-gray-200"></div>}
              </div>
              <div className="pb-4">
                <p className="font-medium text-gray-900">{item.action}</p>
                <p className="text-xs text-gray-500">{item.time} por {item.user}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Notas</h2>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Adicione notas sobre este incidente..."
        ></textarea>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => navigate('/incidents')} variant="secondary">
          Voltar
        </Button>
        <Button onClick={handleMarkResolved} variant="primary">
          Marcar como Resolvido
        </Button>
      </div>
    </div>
  );
}
