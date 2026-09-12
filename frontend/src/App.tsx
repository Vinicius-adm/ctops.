import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";

// ===== PÁGINAS PÚBLICAS =====
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";

// ===== PÁGINAS PROTEGIDAS =====
import { HomePage } from "@/pages/HomePage"; // Dashboard principal
import { JobsPage } from "@/pages/JobsPage"; // Health check jobs
import { APIsPage } from "@/pages/APIsPage"; // Monitoramento de APIs
import {
  DatabasesPage, // Gerenciamento de bancos de dados
  AgentsPage, // Agents de automação
  DockerPage, // Containers Docker/Azure
  IncidentsPage, // Gerenciamento de incidentes
  AlertsPage, // Regras de alertas
  AdminPage, // Painel administrativo
} from "@/pages/ResourcesPages";
import { JobDetailPage, APIDetailPage, IncidentDetailPage } from "@/pages/DetailPages";
import { ProfilePage } from "@/pages/ProfilePage"; // Perfil do usuário

import ContainerDetailPage from "@/pages/ContainerDetailPage";
import DatabaseDetailPage from "@/pages/DatabaseDetailPage";

import "./index.css";

// ===== COMPONENTE PRINCIPAL =====
// Configura roteamento e providers (Auth + Layout)
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* ===== ROTAS PÚBLICAS (SEM AUTENTICAÇÃO) ===== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ===== REDIRECIONAR RAIZ PARA HOME ===== */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* ===== ROTAS PROTEGIDAS (COM LAYOUT E AUTENTICAÇÃO) ===== */}
          <Route
            element={
              <ProtectedRoute>
                <Layout>
                  <Outlet />
                </Layout>
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route path="/home" element={<HomePage />} />

            {/* Jobs */}
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />

            {/* APIs */}
            <Route path="/apis" element={<APIsPage />} />
            <Route path="/apis/:id" element={<APIDetailPage />} />

            {/* Bancos de Dados */}
            <Route path="/databases" element={<DatabasesPage />} />
            <Route path="/databases/:id" element={<DatabaseDetailPage />} />

            {/* Agents */}
            <Route path="/agents" element={<AgentsPage />} />

            {/* Containers Docker/Azure */}
            <Route path="/docker" element={<DockerPage />} />
            <Route path="/containers/:id" element={<ContainerDetailPage />} />

            {/* Incidentes */}
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />

            {/* Alertas */}
            <Route path="/alerts" element={<AlertsPage />} />

            {/* Perfil do Usuário */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* ===== ROTAS ADMIN =====*/}
            <Route
              element={
                <ProtectedRoute requiredRole="ADMIN_MASTER">
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* ===== PÁGINA 404 (DENTRO DO PROTEGIDO) ===== */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* ===== PÁGINAS DE ERRO (FORA DO PROTEGIDO) ===== */}
          <Route
            path="/forbidden"
            element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-red-600">403</h1>
                  <p className="text-xl text-gray-600">Acesso Negado</p>
                </div>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-600">404</h1>
        <p className="text-xl text-gray-600">Página não encontrada</p>
      </div>
    </div>
  );
}

export default App;
