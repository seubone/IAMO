import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Confirmando seu email...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session after email confirmation
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          // User is authenticated after email confirmation
          const user = session.user;

          // Fetch user profile from local DB or create it
          try {
            const userResponse = await fetch("/api/auth/me", {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();
              setAuth(userData, session.access_token);

              toast({
                title: "Email confirmado com sucesso! ✓",
                description: `Bem-vindo, ${userData.name}`,
              });

              // Redirect to dashboard after 2 seconds
              setTimeout(() => {
                setLocation("/");
              }, 2000);
            } else {
              throw new Error("Erro ao carregar dados do usuário");
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            toast({
              variant: "destructive",
              title: "Erro",
              description: "Erro ao carregar dados do usuário",
            });
            setLocation("/login");
          }
        } else {
          // No session, user might not have confirmed email yet
          setMessage(
            "Se você confirmou seu email, faça login com suas credenciais. Se não recebeu o email, verifique a pasta de spam."
          );
          setLoading(false);

          // Redirect to login after 5 seconds
          setTimeout(() => {
            setLocation("/login");
          }, 5000);
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        setMessage(
          "Erro ao confirmar email. Por favor, tente novamente ou entre em contato com o suporte."
        );
        setLoading(false);

        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Erro ao confirmar email",
        });

        setTimeout(() => {
          setLocation("/login");
        }, 5000);
      }
    };

    handleCallback();
  }, [setLocation, setAuth, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-heading">Monitor IA</CardTitle>
          <CardDescription>Confirmando seu email...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {loading && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            )}

            {!loading && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">{message}</div>
                <p className="text-xs text-muted-foreground">
                  Redirecionando para login em alguns segundos...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
