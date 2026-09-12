// frontend/src/services/auth.ts
// SERVIÇO DE AUTH ALINHADO COM O BACKEND:
// - POST /auth/login
// - POST /auth/register
// - GET  /auth/me
// - PATCH /auth/change-password
// - POST /auth/avatar

import api, { setToken, clearToken } from "./api";

// ===== TIPOS DO SERVIÇO DE AUTENTICAÇÃO =====
// Representa um usuário autenticado com todas as informações necessárias
export type AuthUser = {
  id: string;             // ID único do usuário
  email: string;          // Email da conta
  name: string;           // Nome completo
  role: string;           // Papel do usuário (USER ou ADMIN_MASTER)
  avatar_url?: string | null;  // URL da imagem de perfil
  is_active?: boolean;    // Flag indicando se o usuário está ativo
  created_at?: string;    // Data de criação da conta
  updated_at?: string;    // Data da última atualização
};

// Resposta retornada pelo servidor após login/registro
export type AuthResponse = {
  access_token: string;   // Token JWT para autorização nas próximas requisições
  user?: AuthUser;        // Dados do usuário (opcional em algumas respostas)
};

// ===== FUNÇÃO HELPER PARA EXTRAIR MENSAGEM DE ERRO =====
// Extrai a mensagem de erro das diferentes respostas do Axios
// Tenta várias propriedades comuns: error, message, message de erro genérico
function getAxiosErrorMessage(err: unknown): string {
  const e = err as any;

  // Tenta primeiro na resposta do servidor, depois na exceção geral
  const msg =
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    "Erro desconhecido";

  return String(msg);
}

export const authService = {
  // ===== LOGIN DO USUÁRIO =====
  // Envia credenciais para o servidor e recebe o token JWT
  // Se bem-sucedido, armazena o token no localStorage para futuras requisições
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    try {
      console.log('[authService] Enviando login para:', payload.email);
      const { data } = await api.post<AuthResponse>("/auth/login", payload);
      console.log('[authService] Resposta recebida:', { has_token: !!data?.access_token, has_user: !!data?.user });
      if (data?.access_token) {
        setToken(data.access_token);
        console.log('[authService] Token armazenado no localStorage');
      }
      return data;
    } catch (err) {
      const errorMsg = getAxiosErrorMessage(err);
      console.error('[authService] Erro no login:', errorMsg);
      throw new Error(errorMsg);
    }
  },

  // ===== REGISTRO DE NOVO USUÁRIO =====
  // Cria uma nova conta com nome, email e senha
  // Assim como no login, armazena o token se registro bem-sucedido
  async register(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>("/auth/register", payload);
      if (data?.access_token) setToken(data.access_token);
      return data;
    } catch (err) {
      throw new Error(getAxiosErrorMessage(err));
    }
  },

  // ===== OBTER DADOS DO USUÁRIO ATUAL =====
  // Requisita ao servidor os dados do usuário autenticado (baseado no token JWT)
  // Usado para validar token e atualizar dados de usuário na UI
  async me(): Promise<AuthUser> {
    try {
      const { data } = await api.get<AuthUser>("/auth/me");
      return data;
    } catch (err) {
      throw new Error(getAxiosErrorMessage(err));
    }
  },

  // ===== ALTERAR SENHA DO USUÁRIO =====
  // Valida a senha atual e define uma nova
  // Requer que o usuário confirme sua senha antiga por segurança
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.patch("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (err) {
      throw new Error(getAxiosErrorMessage(err));
    }
  },

  // ===== UPLOAD DE AVATAR (FOTO DE PERFIL) =====
  // Envia um arquivo de imagem usando multipart/form-data
  // Retorna a URL do avatar após salvo no servidor
  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    try {
      const form = new FormData();
      form.append("avatar", file);

        // POST com cabeçalho apropriado para envio de arquivo
        const { data } = await api.post<{ avatar_url: string }>("/auth/avatar", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        return data;
      } catch (err) {
        throw new Error(getAxiosErrorMessage(err));
      }
    },

    // ===== LOGOUT DO USUÁRIO =====
    // Remove o token JWT do localStorage para encerrar a sessão
    // Não faz requisição ao servidor, apenas limpa dados locais
    logout() {
      clearToken();
    },
  };

// ===== EXPORTAÇÃO DO SERVIÇO =====
// authService é o objeto singleton que contém todos os métodos de autenticação
// Deve ser importado e usado pelos componentes que precisam fazer login/registro/logout
export default authService;