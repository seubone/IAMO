import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Key, Bell, Upload, Camera } from "lucide-react";
import { auth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, setAuth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, uploadAvatar, error: profileError } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; avatar?: string }) => auth.updateProfile(data),
    onSuccess: (data) => {
      setAuth(data, localStorage.getItem("auth_token") || "");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o perfil",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      auth.updatePassword(data),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha",
      });
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada com sucesso",
      });
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Erro ao fazer upload da foto",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveProfile = () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome não pode estar vazio",
      });
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim()
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres",
      });
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold font-heading">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
      </div>

      <div className="flex-1 p-6">
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal" data-testid="tab-personal">
              <User className="h-4 w-4 mr-2" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="preferences" data-testid="tab-preferences">
              <Bell className="h-4 w-4 mr-2" />
              Preferências
            </TabsTrigger>
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <Key className="h-4 w-4 mr-2" />
              Integrações Pessoais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile?.avatar_url || user?.avatar || ""} alt={user?.name || "Avatar"} />
                      <AvatarFallback className="text-2xl">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 hover:bg-primary/90 disabled:opacity-50 transition-all"
                      title="Clique para mudar a foto de perfil"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Foto de Perfil</p>
                    <p className="text-sm text-muted-foreground">
                      Clique na câmera ou no botão abaixo para fazer upload
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      className="hidden"
                      data-testid="input-avatar-file"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      data-testid="button-upload-avatar"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingAvatar ? "Enviando..." : "Escolher Arquivo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Máximo 5MB • JPEG, PNG, WebP ou GIF
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email}
                      disabled
                      data-testid="input-email"
                    />
                    <p className="text-sm text-muted-foreground">
                      O email não pode ser alterado
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <Input
                      id="role"
                      value={user?.role}
                      disabled
                      data-testid="input-role"
                      className="capitalize"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>
                  Altere sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    data-testid="input-current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleChangePassword}
                    disabled={updatePasswordMutation.isPending}
                    data-testid="button-change-password"
                  >
                    {updatePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Configure como você deseja ser notificado sobre eventos importantes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  As preferências de notificação serão implementadas em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integrações Pessoais</CardTitle>
                <CardDescription>
                  Conecte suas ferramentas pessoais e serviços
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  As integrações pessoais serão implementadas em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
