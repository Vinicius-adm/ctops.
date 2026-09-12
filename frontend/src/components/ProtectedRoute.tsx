// ===== COMPONENTE: ROTA PROTEGIDA =====
// Wrapper para rotas que precisam de autenticação
// Verifica:
// 1. Se usuário está carregando, mostra spinner
// 2. Se não está autenticado, redireciona para /login
// 3. Se requer role específica e usuário não tem, redireciona para /forbidden
// 4. Caso contrário, renderiza o componente filhoConst

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;  // ex: 'ADMIN_MASTER', 'USER'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // ===== ENQUANTO CARREGANDO, MOSTRAR SPINNER =====
  // Verifica token salvo e carrega dados do usuário
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  // ===== REDIRECIONAR SE NÃO AUTENTICADO =====
  // Sem token ou token inválido
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ===== REDIRECIONAR SE ROLE INSUFICIENTE =====
  // Se rota exigir ADMIN_MASTER mas usuário for USER
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/forbidden" replace />;
  }

  // ===== RENDERIZAR CONTEÚDO PROTEGIDO =====
  return <>{children}</>;
}

