import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Loader2, Upload, X } from "lucide-react";

export function UserOnboarding() {
  const { user } = useAuth();
  const { profile, isLoading: isProfileLoading, updateProfile, uploadAvatar } = useUserProfile();

  const [isOpen, setIsOpen] = useState(!profile?.name && !!user);
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState<"name" | "avatar">("name");
  const [name, setName] = useState(profile?.name || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(profile?.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Trigger animation on mount
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

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
    <>
      {/* Animated fullscreen overlay */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .onboarding-container {
          animation: slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      <div className="onboarding-container fixed inset-0 z-50 bg-background flex items-center justify-center">
        {/* Content Container */}
        <div className="w-full h-full flex flex-col items-center justify-center px-4 py-8">
          {step === "name" ? (
            <div className="w-full max-w-md space-y-8 animate-in">
              {/* Header */}
              <div className="space-y-4 text-center">
                <h1 className="text-5xl font-bold text-foreground tracking-tight">Bem-vindo!</h1>
                <p className="text-lg text-muted-foreground">Vamos começar com seu nome e sobrenome (obrigatório)</p>
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Digite seu nome e sobrenome"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isLoading && !isProfileLoading) {
                        handleNameSubmit();
                      }
                    }}
                    className="py-6 text-base"
                    autoFocus
                    disabled={isLoading || isProfileLoading}
                  />
                  {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                </div>

                <Button
                  onClick={handleNameSubmit}
                  disabled={!name.trim() || isLoading || isProfileLoading}
                  className="w-full py-6 font-semibold text-base rounded-lg transition"
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
            </div>
          ) : (
            <div className="w-full max-w-md space-y-8 animate-in">
              {/* Header */}
              <div className="space-y-4 text-center">
                <h1 className="text-5xl font-bold text-foreground tracking-tight">Foto de Perfil</h1>
                <p className="text-lg text-muted-foreground">Adicione uma foto (opcional - pode pular)</p>
              </div>

              {/* Avatar Section */}
              <div className="space-y-6">
                {avatarPreview ? (
                  <div className="relative mx-auto">
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-40 h-40 rounded-full object-cover mx-auto border-4 border-primary shadow-xl"
                    />
                    <button
                      onClick={() => {
                        setAvatarPreview("");
                        setAvatarFile(null);
                      }}
                      className="absolute top-0 right-0 bg-destructive text-primary-foreground rounded-full p-2 hover:bg-destructive/90 shadow-lg"
                      disabled={isLoading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:bg-accent transition"
                    onClick={() => {
                      if (!isLoading) {
                        document.getElementById("avatar-input")?.click();
                      }
                    }}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-base font-medium text-foreground">Clique para selecionar foto</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG até 5MB</p>
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

                {error && <p className="text-sm text-destructive text-center">{error}</p>}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep("name")}
                    disabled={isLoading}
                    className="flex-1 py-6 font-semibold rounded-lg"
                  >
                    Voltar
                  </Button>

                  <Button
                    onClick={() => handleComplete()}
                    disabled={isLoading}
                    className="flex-1 py-6 font-semibold rounded-lg"
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

                {/* Skip Button */}
                <button
                  onClick={() => handleComplete()}
                  disabled={isLoading}
                  className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition font-medium"
                >
                  Pular esta etapa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
