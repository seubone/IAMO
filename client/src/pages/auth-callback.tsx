import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { handleGoogleCallback } from "@/lib/google-auth";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function processCallback() {
      try {
        // Handle the Google OAuth callback
        const authData = await handleGoogleCallback();

        if (authData && authData.user && authData.token) {
          // Set authentication
          setAuth(authData.user, authData.token);

          toast({
            title: "Autenticação bem-sucedida!",
            description: `Bem-vindo, ${authData.user.name}`,
          });

          // Redirect to home page
          setLocation("/");
        } else {
          throw new Error("Dados de autenticação inválidos");
        }
      } catch (error) {
        console.error("Auth callback error:", error);

        const errorMessage = error instanceof Error ? error.message : "Erro ao processar autenticação";
        toast({
          variant: "destructive",
          title: "Erro na autenticação",
          description: errorMessage,
        });

        // Redirect back to login after error
        setTimeout(() => {
          setLocation("/auth/login");
        }, 2000);
      } finally {
        setIsProcessing(false);
      }
    }

    processCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Processando autenticação...</h2>
        <p className="text-muted-foreground">Por favor, aguarde enquanto processamos sua autenticação com o Google.</p>
      </div>
    </div>
  );
}
