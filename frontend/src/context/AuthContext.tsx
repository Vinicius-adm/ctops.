// ===== CONTEXTO DE AUTENTICAÇÃO =====
// Gerencia estado global de login/logout, token JWT e dados do usuário
// Features: login, register, refreshMe, avatar override (localStorage)

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import authService, { AuthResponse, AuthUser } from "@/services/auth";
import { getToken } from "@/services/api";

// ===== FUNÇÃO HELPER: EXTRAIR MENSAGEM DE ERRO =====
// Extrai mensagem de erro de diferentes fontes de erro
function getErrorMessage(err: unknown): string {
  const e = err as any;
  return e?.message || "Erro desconhecido";
}

// ===== TIPO: OVERRIDE DE AVATAR =====
// Armazena avatar localmente para não perder em reload de página
// Solução temporária enquanto o backend persiste a imagem
type AvatarOverride = {
  avatar_url: string;
  v: number; // versão/timestamp para invalidar cache se necessário
};

// ===== TIPO: VALOR DO CONTEXTO =====
// Define todas as propriedades e métodos disponíveis no contexto de autenticação
type AuthContextValue = {
  user: AuthUser | null; // Dados do usuário autenticado
  loading: boolean; // Se ainda está carregando dados iniciais

  // ALIASES PARA COMPATIBILIDADE com diferentes padrões de nomes
  isLoading: boolean;
  isAuthenticated: boolean;

  // MÉTODOS DE AUTENTICAÇÃO PRINCIPAIS
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;

  // MÉTODOS DE ATUALIZAÇÃO
  refreshMe: () => Promise<void>; // Busca dados atualizados do servidor
  refreshUser: () => Promise<void>; // Alias para refreshMe
  updateUser: (partial: Partial<AuthUser>) => void; // Atualiza estado localmente

  // MÉTODOS DE AVATAR OVERRIDE
  setAvatarOverride: (userId: string, avatar_url: string) => void; // Guardar avatar no localStorage
  clearAvatarOverride: (userId: string) => void; // Limpar avatar do localStorage
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ===== CONSTANTES PARA STORAGE =====
// Prefixo para chaves no localStorage que armazenam avatar override
const AVATAR_OVERRIDE_PREFIX = "ctops:avatar_override:";

// ===== HELPERS: AVATAR OVERRIDE =====
// Conjunto de funções para gerenciar cache de avatar no localStorage
// Evita perder foto de perfil quando página é recarregada durante edição

// Cria chave única para o usuário
function overrideKey(userId: string) {
  return `${AVATAR_OVERRIDE_PREFIX}${userId}`;
}

// Lê avatar override do localStorage para um usuário específico
function readOverride(userId: string): AvatarOverride | null {
  try {
    const raw = localStorage.getItem(overrideKey(userId));
    if (!raw) return null;
    const obj = JSON.parse(raw) as AvatarOverride;
    if (!obj?.avatar_url) return null;
    return obj;
  } catch {
    return null; // JSON inválido ou chave não existe
  }
}

// Escreve avatar override no localStorage
function writeOverride(userId: string, avatar_url: string) {
  const payload: AvatarOverride = { avatar_url, v: Date.now() };
  localStorage.setItem(overrideKey(userId), JSON.stringify(payload));
}

// Remove avatar override do localStorage
function removeOverride(userId: string) {
  localStorage.removeItem(overrideKey(userId));
}

// ===== PROVIDER DO CONTEXTO =====
// Componente que envolve a aplicação e fornece acesso ao contexto de autenticação
// Responsável por gerenciar estado global de login/logout
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== ATUALIZAR USUÁRIO LOCALMENTE =====
  // Realiza merge parcial dos dados do usuário no estado
  // Utilizado para refletir mudanças sem fazer requisição ao servidor (ex: após upload de avatar)
  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...partial };
    });
  }, []);

  // ===== GUARDAR AVATAR NO CACHE =====
  // Armazena avatar no localStorage (para evitar perder ao relogar)
  // Também atualiza estado imediatamente
  const setAvatarOverride = useCallback((userId: string, avatar_url: string) => {
    if (!userId || !avatar_url) return;
    writeOverride(userId, avatar_url);

    // Atualiza estado na hora
    setUser((prev) => {
      if (!prev) return prev;
      if (prev.id !== userId) return prev;
      return { ...prev, avatar_url };
    });
  }, []);

  // ===== LIMPAR AVATAR DO CACHE =====
  // Remove avatar override do localStorage
  const clearAvatarOverride = useCallback((userId: string) => {
    if (!userId) return;
    removeOverride(userId);
  }, []);

  // ===== CARREGAR DADOS DO USUÁRIO DO SERVIDOR =====
  // Busca essencialmente fazendo request GET /auth/me
  // Aplica avatar override se existir (solução temporária para cache de avatar)
  // Limpa estado se token inválido (erro 401)
  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const me = await authService.me();

      // APLICA OVERRIDE SE EXISTIR (enquanto backend não persiste imagem)
      const ov = readOverride(me.id);
      const finalUser: AuthUser = ov ? { ...me, avatar_url: ov.avatar_url } : me;

      setUser(finalUser);
    } catch (err) {
      // TOKEN INVÁLIDO/EXPIRADO: fazer logout silenciosamente
      authService.logout();
      setUser(null);
      throw new Error(getErrorMessage(err));
    }
  }, []);

  // ===== INICIALIZAR CONTEXTO QUANDO PROVIDER MONTA =====
  // Verifica se há token salvo no localStorage e carrega dados do usuário
  // Define loading=false quando termina (independente de sucesso/erro)
  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  // ===== LOGIN DO USUÁRIO =====
  // Envia credenciais ao servidor, recebe token JWT
  // Se resposta incluir dados do usuário, usa-os; senão faz fetch com refreshMe
  // Aplica avatar override se existir no localStorage
  const login = useCallback(
    async (email: string, password: string) => {
      console.log('[AuthContext] Iniciando login para:', email);
      try {
        const res: AuthResponse = await authService.login({ email, password });
        console.log('[AuthContext] Resposta do login:', res);

        // Usa dados retornados ou faz refresh se não incluir usuário na resposta
        if (res.user) {
          console.log('[AuthContext] Usuário na resposta:', res.user);
          const ov = readOverride(res.user.id);
          const finalUser: AuthUser = ov ? { ...res.user, avatar_url: ov.avatar_url } : res.user;
          setUser(finalUser);
          console.log('[AuthContext] Usuário definido:', finalUser);
        } else {
          console.log('[AuthContext] Sem usuário na resposta, fazendo refreshMe');
          await refreshMe();
        }
      } catch (error) {
        console.error('[AuthContext] Erro no login:', error);
        throw error;
      }
    },
    [refreshMe]
  );

  // ===== REGISTRO DE NOVO USUÁRIO =====
  // Cria nova conta com nome, email e senha
  // Similar ao login: usa dados da resposta ou faz refresh
  // Além disso, valida avatar override
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res: AuthResponse = await authService.register({ name, email, password });

      if (res.user) {
        const ov = readOverride(res.user.id);
        const finalUser: AuthUser = ov ? { ...res.user, avatar_url: ov.avatar_url } : res.user;
        setUser(finalUser);
      } else {
        await refreshMe();
      }
    },
    [refreshMe]
  );

  // ===== LOGOUT DO USUÁRIO =====
  // Remove token do localStorage (via authService.logout)
  // Limpa estado do usuário para refletir logout na UI
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  // ===== CRIAR VALOR DO CONTEXTO =====
  // Usememo garante que value só mude quando dependências mudarem
  // Evita re-renders desnecessários de componentes que usam useAuth()
  const value = useMemo<AuthContextValue>(
    () => ({
      // Estado e flags
      user,
      loading,
      isLoading: loading,  // Alias
      isAuthenticated: !!user,  // Alias: true se user não é null

      // Métodos de autenticação
      login,
      register,
      logout,

      // Métodos de sincronização
      refreshMe,
      refreshUser: refreshMe,  // Alias

      // Métodos de atualização local
      updateUser,
      setAvatarOverride,
      clearAvatarOverride,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      refreshMe,
      updateUser,
      setAvatarOverride,
      clearAvatarOverride,
    ]
  );

  // ===== RETORNAR PROVIDER =====
  // Fornece contexto a todos os componentes filhos
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===== HOOK: useAuth() =====
// Hook para acessar contexto de autenticação dentro de qualquer componente
// Lança erro se usado fora de AuthProvider (boa prática)
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}

// ===== ALIAS: useAuthContext() ==== 
// Mesmo que useAuth, para compatibilidade com diferentes padrões de nomenclatura
export const useAuthContext = useAuth;
