// ===== COMPONENTE: LAYOUT DA APLICAÇÃO =====
// Template visual principal envelopando todas as páginas autenticadas
// Contém: sidebar de navegação, topbar com perfil/logout, conteúdo dinâmico

import { ReactNode, useMemo, useState } from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { IncidentBell } from '@/components/IncidentBell';

interface LayoutProps {
  children: ReactNode;  // Conteúdo da página que será renderizado dentro do layout
}

// ===== TIPO: AVATAR OVERRIDE =====
// Estrutura de cache temporário para avatar no localStorage (compatível com AuthContext)
type AvatarOverride = {
  avatar_url: string;
  v: number;  // Versão/timestamp para invalidar cache de imagem no navegador
};

const AVATAR_OVERRIDE_PREFIX = "ctops:avatar_override:";

// ===== HELPER: CONSTRUIR URL DO AVATAR =====
// Trata diferentes formas de URL de imagem:
// - Blob URLs (preview local): blob://... → retorna como está
// - Data URLs (base64): data:image/... → retorna como está
// - URLs absolutas: https://cdn.example.com/... → retorna como está
// - URLs relativas: /uploads/avatars/... → adiciona base API URL
function buildAvatarUrl(apiUrl: string, avatar_url: string): string {
  if (!avatar_url) return "";

  // SUPORTA preview local (URL.createObjectURL) E BASE64
  if (/^(blob:|data:)/i.test(avatar_url)) return avatar_url;

  // SE FOR URL ABSOLUTA (CDN/SUPABASE/ETC)
  if (/^https?:\/\//i.test(avatar_url)) return avatar_url;

  // SE FOR RELATIVA (EX.: /uploads/avatars/arquivo.jpg)
  const path = avatar_url.startsWith("/") ? avatar_url : `/${avatar_url}`;
  return `${apiUrl}${path}`;
}

// ===== HELPER: LER AVATAR DO CACHE LOCAL =====
// Busca avatar override do localStorage (salvo durante upload/edição)
// Usado para não perder imagem ao relogar antes de servidor persistir
function readAvatarOverride(userId?: string | null): AvatarOverride | null {
  try {
    if (!userId) return null;
    const raw = localStorage.getItem(`${AVATAR_OVERRIDE_PREFIX}${userId}`);
    if (!raw) return null;
    const obj = JSON.parse(raw) as AvatarOverride;
    if (!obj?.avatar_url) return null;
    return obj;
  } catch {
    return null;
  }
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);  // Controla sidebar colapsado/expandido
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);  // Controla menu dropdown do perfil

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // ===== ITENS DO MENU DE NAVEGAÇÃO =====
  // Lista de rotas acessíveis do menu sidebar
  // Menu admin (Administração) só aparece se user.role === 'ADMIN_MASTER'
  const menuItems = [
    { label: 'Home', path: '/home', icon: '🏠' },
    { label: 'Automações', path: '/jobs', icon: '⚙️' },
    { label: 'APIs', path: '/apis', icon: '🔌' },
    { label: 'Bancos', path: '/databases', icon: '🗄️' },
    { label: 'Docker', path: '/docker', icon: '🐳' },
    { label: 'Agentes', path: '/agents', icon: '🤖' },
    { label: 'Incidentes', path: '/incidents', icon: '⚠️' },
    { label: 'Alertas', path: '/alerts', icon: '🔔' },
    ...(user?.role === 'ADMIN_MASTER' ? [{ label: 'Administração', path: '/admin', icon: '⚙️' }] : [])
  ];

  // ===== HANDLER: LOGOUT =====
  // Executa logout no contexto e redireciona para login
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ===== HELPER: VERIFICAR SE ROTA ESTÁ ATIVA =====
  // Compara pathname atual com path do item de menu
  const isActive = (path: string) => location.pathname === path;

  // ===== CALCULAR INICIAIS DO USUÁRIO =====
  // Usado no avatar como fallback: primeira letra do nome
  const initials = useMemo(() => {
    const n = user?.name?.trim();
    return n ? n.charAt(0).toUpperCase() : "U";
  }, [user?.name]);

  // ===== CONSTRUIR URL DO AVATAR PARA TOPBAR =====
  // Aplica avatar override se existir (cache local durante edição)
  // Adiciona query param 'v' para invalidar cache do navegador
  // Blob/data URLs não precisam de cache-bust
  const topAvatarSrc = useMemo(() => {
    if (!user?.avatar_url) return null;

    const ov = readAvatarOverride(user.id);
    const v = ov?.v || 0;

    const url = buildAvatarUrl(API_URL, user.avatar_url);

    // EVITA CACHE PARA URLS HTTP/RELATIVAS (adiciona v= param)
    if (/^https?:\/\//i.test(url) || url.startsWith(API_URL)) {
      return url.includes("?") ? `${url}&v=${v || Date.now()}` : `${url}?v=${v || Date.now()}`;
    }

    // blob:/data: não precisa de cache-bust
    return url;
  }, [API_URL, user?.avatar_url, user?.id]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ===== SIDEBAR DE NAVEGAÇÃO ===== */}
      {/* Barra lateral com logo, menu de navegação e botão de toggle */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Logo e Nome da App */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
              CT
            </div>
            {sidebarOpen && <span className="ml-3 font-bold text-lg">CTOps</span>}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full px-4 py-3 flex items-center space-x-3 transition ${
                isActive(item.path)
                  ? 'bg-blue-600 border-r-4 border-blue-400'
                  : 'hover:bg-gray-800'
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle Sidebar Button */}
        <div className="border-t border-gray-800 p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 rounded hover:bg-gray-800 transition"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </div>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <div className="flex-1 flex flex-col">
        {/* Topbar com Título e Menu de Perfil */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Control Tower OPS</h1>

          <div className="flex items-center space-x-6">
            {/* ===== BELL DE INCIDENTES ===== */}
            {/* Notificações em tempo real (em desenvolvimento) */}
            <IncidentBell />

            {/* ===== MENU DE PERFIL DO USUÁRIO ===== */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 transition"
              >
                {/* Avatar ou Iniciais */}
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-blue-600">
                  {topAvatarSrc ? (
                    <img
                      src={topAvatarSrc}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // SE IMAGEM DER 404, ESCONDE (display user icon no lugar)
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}

                  {!topAvatarSrc && (
                    <span className="sr-only">{initials}</span>
                  )}
                </div>

                {/* Nome e Role do Usuário */}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'ADMIN_MASTER' ? 'Admin' : 'Usuário'}
                  </p>
                </div>
              </button>

              {/* Dropdown Menu: Perfil e Logout */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {/* Opção: Ir para Perfil */}
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition text-sm text-gray-700"
                  >
                    Meu Perfil
                  </button>
                  {/* Opção: Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 transition text-sm text-red-600 flex items-center space-x-2 border-t border-gray-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Área de Conteúdo Dinâmico */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

