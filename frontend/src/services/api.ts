// frontend/src/services/api.ts
// ===== CLIENTE HTTP AXIOS COM TOKEN DINÂMICO =====

import axios from "axios";

// ===== BASE URL =====
// 1) USA VITE_API_URL SE EXISTIR
// 2) FALLBACK PRA http://localhost:3001 (API DO BACKEND)
// OBS: 5433 É PORTA DO POSTGRES, NAO DA API
const RAW =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "http://localhost:3001";

const API_URL = RAW.replace(/\/+$/, "");

// LOG PRA VOCÊ VER NO CONSOLE EXATAMENTE PRA ONDE ELE VAI CHAMAR
console.log("[api] BASE_URL =", API_URL);

export const TOKEN_KEY = "access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  // SE VC FOR USAR COOKIE/SESSION UM DIA, LIGA ISSO:
  // withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  config.headers = config.headers || {};

  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  } else {
    delete (config.headers as any).Authorization;
  }

  console.log(
    `[api] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} (token: ${!!token})`
  );

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(err);
  }
);

export default api;
