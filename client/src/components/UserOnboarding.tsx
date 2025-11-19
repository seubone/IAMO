import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Loader2, Upload, X } from "lucide-react";

export function UserOnboarding() {
  const { user } = useAuth();
  const { profile, isLoading: isProfileLoading, updateProfile, uploadAvatar } = useUserProfile();

  const [isOpen, setIsOpen] = useState(!profile?.name && !!user);
  const [step, setStep] = useState<"name" | "avatar">("name");
  const [name, setName] = useState(profile?.name || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(profile?.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameSubmit = () => {
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    setError("");
    setStep("avatar");
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    setError("");

    try {
      let avatarUrl = profile?.avatar_url;

      // If avatar file is selected, upload it
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      // Update profile in database
      await updateProfile({
        name: name.trim(),
        avatar_url: avatarUrl,
      });

      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === "name" ? (
          <>
            <DialogHeader>
              <DialogTitle>Bem-vindo!</DialogTitle>
              <DialogDescription>
                Vamos começar com o seu nome completo (obrigatório)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNameSubmit();
                    }
                  }}
                  className="py-6 text-base"
                  autoFocus
                  disabled={isLoading || isProfileLoading}
                />
                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
              </div>

              <Button
                onClick={handleNameSubmit}
                disabled={!name.trim() || isLoading || isProfileLoading}
                className="w-full py-6"
              >
                {isLoading || isProfileLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Próximo"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Foto de Perfil</DialogTitle>
              <DialogDescription>
                Adicione uma foto de perfil (opcional - pode pular)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {avatarPreview ? (
                <div className="relative mx-auto">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover mx-auto"
                  />
                  <button
                    onClick={() => {
                      setAvatarPreview("");
                      setAvatarFile(null);
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent transition"
                  onClick={() => {
                    if (!isLoading) {
                      document.getElementById("avatar-input")?.click();
                    }
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para selecionar foto</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                </div>
              )}

              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
                disabled={isLoading}
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("name")}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Voltar
                </Button>

                <Button
                  onClick={() => handleComplete()}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Concluir"
                  )}
                </Button>
              </div>

              <button
                onClick={() => handleComplete()}
                disabled={isLoading}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition"
              >
                Pular esta etapa
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
