import React, { useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, Button, FormInput } from "@/components/Common";
import authService from "@/services/auth";
import { Camera } from "lucide-react";

type MessageType = "success" | "error";

function buildAvatarUrl(apiUrl: string, avatar_url: string): string {
  if (!avatar_url) return "";

  // SE FOR URL ABSOLUTA (CDN/SUPABASE)
  if (/^https?:\/\//i.test(avatar_url)) return avatar_url;

  // SE FOR RELATIVA (EX.: /uploads/arquivo.png)
  const path = avatar_url.startsWith("/") ? avatar_url : `/${avatar_url}`;
  return `${apiUrl}${path}`;
}

export function ProfilePage() {
  const { user, refreshUser, updateUser, setAvatarOverride } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>("success");
  const [loading, setLoading] = useState(false);

  // CACHE-BUSTING PRA IMG SEMPRE RECARREGAR QUANDO MUDA
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTimerRef = useRef<number | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const showMessage = (text: string, type: MessageType) => {
    setMessage(text);
    setMessageType(type);

    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setMessage(null), 5000);
  };

  const avatarSrc = useMemo(() => {
    if (!user?.avatar_url) return null;

    const url = buildAvatarUrl(API_URL, user.avatar_url);
    return url.includes("?") ? `${url}&v=${avatarVersion}` : `${url}?v=${avatarVersion}`;
  }, [API_URL, user?.avatar_url, avatarVersion]);

  const initials = useMemo(() => {
    const n = user?.name?.trim();
    return n ? n.charAt(0).toUpperCase() : "U";
  }, [user?.name]);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleUpdateProfile = async () => {
    // SE VOCE TIVER ENDPOINT PRA ATUALIZAR NOME, IMPLEMENTE AQUI.
    // POR ENQUANTO REFLETE LOCALMENTE:
    updateUser({ name });
    showMessage("Perfil atualizado com sucesso!", "success");
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showMessage("Preencha todos os campos de senha.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showMessage("A nova senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("Senhas não conferem!", "error");
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showMessage("Senha alterada com sucesso!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showMessage(error?.message || "Erro ao alterar senha", "error");
    } finally {
      setLoading(false);
    }
  };

const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // PERMITE RE-ENVIAR O MESMO ARQUIVO
  event.target.value = "";

  // 1) PREVIEW IMEDIATO
  const previewUrl = URL.createObjectURL(file);
  if (user?.id) setAvatarOverride(user.id, previewUrl);
  else updateUser({ avatar_url: previewUrl });
  setAvatarVersion(Date.now());

  setLoading(true);
  try {
    const data: any = await authService.uploadAvatar(file);

    // 2) ACEITA VARIOS NOMES DE RETORNO DO BACKEND
    const newAvatar =
      data?.avatar_url ||
      data?.avatarUrl ||
      data?.url ||
      data?.path ||
      null;

    if (!newAvatar) {
      // SE NAO VEIO URL, PELO MENOS NAO SOBRESCREVE O PREVIEW
      showMessage("Upload concluído, mas o servidor não retornou a URL do avatar.", "error");
      return;
    }

    // 3) APLICA IMEDIATAMENTE (E SEGURA COM OVERRIDE PRA NAO “VOLTAR”)
    if (user?.id) setAvatarOverride(user.id, newAvatar);
    else updateUser({ avatar_url: newAvatar });

    // 4) QUEBRA CACHE SEMPRE
    setAvatarVersion(Date.now());

    // 5) REFRESH /ME, MAS SEM DEIXAR ELE SOBRESCREVER O AVATAR NOVO
    // (O OVERRIDE NO AuthContext SEGURA)
    await refreshUser().catch(() => {});
    setAvatarVersion(Date.now());

    showMessage("Foto de perfil atualizada!", "success");
  } catch (error: any) {
    showMessage("Erro ao enviar foto: " + (error?.message || "Desconhecido"), "error");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600 mt-2">Gerenciamento de perfil e segurança</p>
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 border rounded ${
            messageType === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* PROFILE INFO */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Informações Pessoais</h2>

        <div className="flex items-center mb-6">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={loading}
            className="relative group cursor-pointer"
            aria-label="Alterar foto de perfil"
            title="Alterar foto de perfil"
          >
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl overflow-hidden border-2 border-gray-200 ${
                !avatarSrc ? "bg-blue-600" : "bg-white"
              }`}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={() => {
                    updateUser({ avatar_url: null });
                  }}
                />
              ) : (
                initials
              )}
            </div>

            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200">
              <Camera className="text-white opacity-0 group-hover:opacity-100 w-8 h-8" aria-hidden="true" />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              aria-label="Selecionar arquivo de imagem para o avatar"
            />
          </button>

          <div className="ml-6">
            <p className="font-medium text-gray-900 text-lg">{user?.name || "-"}</p>
            <p className="text-gray-600">{user?.email || "-"}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
              {user?.role === "ADMIN_MASTER" ? "Administrador" : "Usuário"}
            </p>

            <button
              type="button"
              onClick={openFilePicker}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 font-medium disabled:opacity-60"
              aria-label="Alterar foto"
              title="Alterar foto"
            >
              Alterar foto
            </button>
          </div>
        </div>

        <FormInput label="Nome Completo" value={name} onChange={setName} placeholder="Seu nome" />

        <Button onClick={handleUpdateProfile} variant="primary" disabled={loading}>
          Atualizar Perfil
        </Button>
      </Card>

      {/* CHANGE PASSWORD */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Alterar Senha</h2>

        <FormInput
          label="Senha Atual"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Digite sua senha atual"
        />

        <FormInput
          label="Nova Senha"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Digite a nova senha (min. 6 caracteres)"
        />

        <FormInput
          label="Confirmar Senha"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirme a nova senha"
        />

        <Button onClick={handleChangePassword} variant="primary" disabled={loading}>
          {loading ? "Processando..." : "Alterar Senha"}
        </Button>
      </Card>
    </div>
  );
}
