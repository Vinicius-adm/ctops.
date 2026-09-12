import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertTriangle, Server, Database, Container } from "lucide-react";

import { dashboardService, type DashboardSummary } from "@/services/dashboard";

type IssueGroup = {
  key: "apis" | "databases" | "containers" | "incidents" | "agents";
  label: string;
  count: number;
  icon: React.ReactNode;
  hint?: string;
  href?: string;
};

function safeInt(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function IncidentBell() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (e: any) {
      setError(String(e?.message || "Falha ao carregar resumo"));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const groups = useMemo<IssueGroup[]>(() => {
    const apisDown = safeInt(summary?.apis?.down);
    const dbUnhealthy = safeInt(summary?.databases?.unhealthy);
    const containersStopped = safeInt(summary?.containers?.stopped) + safeInt(summary?.containers?.other);
    const agentsUnhealthy = safeInt(summary?.agents?.unhealthy);
    const incidentsOpen = safeInt(summary?.incidents?.open);

    return [
      {
        key: "apis",
        label: "APIs OFFLINE",
        count: apisDown,
        icon: <Server className="w-4 h-4" />,
        hint: apisDown ? "Ver APIs" : undefined,
        href: "/apis",
      },
      {
        key: "databases",
        label: "BANCOS COM FALHA",
        count: dbUnhealthy,
        icon: <Database className="w-4 h-4" />,
        hint: dbUnhealthy ? "Ver bancos" : undefined,
        href: "/databases",
      },
      {
        key: "containers",
        label: "DOCKER COM PROBLEMA",
        count: containersStopped,
        icon: <Container className="w-4 h-4" />,
        hint: containersStopped ? "Ver docker" : undefined,
        href: "/docker",
      },
      {
        key: "agents",
        label: "AGENTES COM FALHA",
        count: agentsUnhealthy,
        icon: <AlertTriangle className="w-4 h-4" />,
        hint: agentsUnhealthy ? "Ver agentes" : undefined,
        href: "/agents",
      },
      {
        key: "incidents",
        label: "INCIDENTES ABERTOS",
        count: incidentsOpen,
        icon: <AlertTriangle className="w-4 h-4" />,
        hint: incidentsOpen ? "Ver incidentes" : undefined,
        href: "/incidents",
      },
    ];
  }, [summary]);

  const totalProblems = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.count > 0 ? g.count : 0), 0);
  }, [groups]);

  const recentIncidents = useMemo(() => {
    const list = summary?.incidents?.recent ?? [];
    return list.slice(0, 6);
  }, [summary]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition rounded hover:bg-gray-100"
        aria-label="Incidentes"
        title={totalProblems ? `Problemas: ${totalProblems}` : "Sem incidentes"}
      >
        <Bell className="w-5 h-5" />
        {totalProblems > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[11px] leading-[18px] text-center rounded-full bg-red-600 text-white font-bold">
            {totalProblems > 99 ? "99+" : totalProblems}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Incidentes</p>
              <p className="text-xs text-gray-500">
                {loading ? "Atualizando…" : error ? "Falha ao atualizar" : "Resumo em tempo real"}
              </p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/incidents");
              }}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Ver tudo →
            </button>
          </div>

          <div className="p-3 space-y-2">
            {groups.map((g) => (
              <button
                key={g.key}
                disabled={!g.href}
                onClick={() => {
                  if (!g.href) return;
                  setOpen(false);
                  navigate(g.href);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition ${
                  g.count > 0
                    ? "border-red-200 bg-red-50 hover:bg-red-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`${g.count > 0 ? "text-red-700" : "text-gray-500"}`}>{g.icon}</span>
                  <span className="text-sm font-semibold text-gray-900">{g.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${g.count > 0 ? "text-red-700" : "text-gray-600"}`}>
                    {g.count}
                  </span>
                </div>
              </button>
            ))}

            <div className="pt-2">
              <p className="text-xs font-bold text-gray-700 px-1">Recentes</p>
              <div className="mt-2 space-y-1">
                {recentIncidents.length === 0 ? (
                  <div className="text-xs text-gray-500 px-1">Nenhum incidente recente.</div>
                ) : (
                  recentIncidents.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => {
                        setOpen(false);
                        navigate(`/incidents/${it.id}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-gray-900 truncate">{it.title}</span>
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">
                          {new Date(it.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[11px] px-2 py-[2px] rounded-full bg-gray-100 text-gray-700">
                          {String(it.severity).toUpperCase()}
                        </span>
                        <span className="text-[11px] px-2 py-[2px] rounded-full bg-blue-50 text-blue-700">
                          {String(it.status).toUpperCase()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
