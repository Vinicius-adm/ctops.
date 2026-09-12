// src/pages/Auth.tsx
// TELA ÚNICA: LOGIN <-> CADASTRO

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "register";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erro desconhecido";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, loading, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (isRegister && !name.trim()) return false;
    return true;
  }, [email, password, name, isRegister]);

  // SE JÁ ESTIVER LOGADO, REDIRECIONA
  React.useEffect(() => {
    if (!loading && isAuthenticated) navigate("/profile", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate("/profile", { replace: true });
    } catch (err) {
      alert((isRegister ? "Erro ao criar conta: " : "Erro ao entrar: ") + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520, border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, textAlign: "center" }}>CTOPS</h1>
        <p style={{ marginTop: 8, marginBottom: 24, textAlign: "center", color: "#6b7280" }}>
          {isRegister ? "Criar conta" : "Entrar"}
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          {isRegister && (
            <label style={{ display: "grid", gap: 6 }}>
              <span>Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                style={{ padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
            </label>
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@dominio.com"
              type="email"
              autoComplete="email"
              style={{ padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Senha</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              style={{ padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
            />
          </label>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setMode(isRegister ? "login" : "register")}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
              }}
              disabled={submitting}
            >
              {isRegister ? "Voltar" : "Criar conta"}
            </button>

            <button
              type="submit"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #1d4ed8",
                background: "#2563eb",
                color: "white",
                cursor: "pointer",
                opacity: canSubmit ? 1 : 0.6,
              }}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
            </button>
          </div>

          <p style={{ marginTop: 12, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
            Ao {isRegister ? "criar conta" : "entrar"}, você verá somente os recursos que cadastrar no app.
          </p>
        </form>
      </div>
    </div>
  );
}
