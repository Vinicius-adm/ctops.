import * as jwt from 'jsonwebtoken';
import { JWTPayload } from '@/types';

const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key') as jwt.Secret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export function generateToken(userId: string, email: string, role: string): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    email,
    role: role as 'USER' | 'ADMIN_MASTER'
  };

  // Converte para any para evitar incompatibilidades de tipo entre versões do jsonwebtoken
  return (jwt.sign as any)(payload, JWT_SECRET as any, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}
