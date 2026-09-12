import { useAuth } from '@/context/AuthContext';

export function useRequireAuth() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    throw new Error('User not authenticated');
  }

  return auth.user!;
}

export function useAdminCheck() {
  const auth = useAuth();
  return auth.user?.role === 'ADMIN_MASTER';
}

export function useIsOwner(ownerId: string | undefined) {
  const auth = useAuth();
  return auth.user?.id === ownerId || auth.user?.role === 'ADMIN_MASTER';
}
