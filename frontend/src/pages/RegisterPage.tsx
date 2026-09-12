// frontend/src/pages/RegisterPage.tsx
// TELA DE CADASTRO (USA AuthContext) - O BACKEND JÁ RETORNA TOKEN + USER NO /auth/register

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Common";
import { useAuth } from "@/context/AuthContext";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erro desconhecido";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!email.trim()) return false;
    if (!password.trim()) return false;
    if (password.trim().length < 6) return false;
    return true;
  }, [name, email, password]);

  async function handleRegister() {
    if (!canSubmit || loading) return;

    try {
      setLoading(true);

      await register(name.trim(), email.trim(), password);

      navigate("/home", { replace: true });
    } catch (err: unknown) {
      alert("Erro ao criar conta: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">CTOPS</h1>
          <p className="text-gray-600 mt-1">Criar conta</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600">Nome</label>
          <input
            className="w-full px-3 py-2 border rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600">Email</label>
          <input
            className="w-full px-3 py-2 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@dominio.com"
            type="email"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600">Senha</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500">Mínimo 6 caracteres.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            Voltar
          </Button>

          <Button
            variant="primary"
            className="flex-1"
            onClick={handleRegister}
            disabled={loading || !canSubmit}
          >
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Ao criar conta, você verá somente os recursos que cadastrar no app.
        </p>
      </div>
    </div>
  );
}
