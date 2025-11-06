import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/api";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onLogin(data: LoginForm) {
    setIsLoading(true);
    try {
      const response = await auth.login(data);
      setAuth(response.user, response.token);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${response.user.name}`,
      });
      setLocation("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Verifique suas credenciais";
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(data: RegisterForm) {
    setIsLoading(true);
    try {
      const response = await auth.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (response.requiresEmailConfirmation) {
        toast({
          title: "Cadastro realizado com sucesso! 📧",
          description: `Verifique o email "${data.email}" para confirmar sua conta. Pode levar alguns minutos para chegar.`,
        });
        registerForm.reset();
      } else {
        setAuth(response.user, response.token);
        toast({
          title: "Cadastro realizado com sucesso!",
          description: `Bem-vindo, ${response.user.name}`,
        });
        setLocation("/");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Tente novamente mais tarde";
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const FormContent = () => (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="login" data-testid="tab-login" className="text-base">
          Entrar
        </TabsTrigger>
        <TabsTrigger value="register" data-testid="tab-register" className="text-base">
          Cadastrar
        </TabsTrigger>
      </TabsList>

      {/* Login Tab */}
      <TabsContent value="login" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 font-heading">Bem-vindo!</h2>
          <p className="text-sm text-muted-foreground">
            Faça login para acessar o painel de controle
          </p>
        </div>

        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      {...field}
                      data-testid="input-login-email"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••"
                      {...field}
                      data-testid="input-login-password"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-muted-foreground">Lembrar-me</span>
              </label>
              <a href="#" className="text-primary hover:underline">
                Esqueceu a senha?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold rounded-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Form>
      </TabsContent>

      {/* Register Tab */}
      <TabsContent value="register" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 font-heading">Criar Conta</h2>
          <p className="text-sm text-muted-foreground">
            Preencha os campos abaixo para se registrar
          </p>
        </div>

        <Form {...registerForm}>
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
            <FormField
              control={registerForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Seu nome completo"
                      {...field}
                      data-testid="input-register-name"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      {...field}
                      data-testid="input-register-email"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••"
                      {...field}
                      data-testid="input-register-password"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••"
                      {...field}
                      data-testid="input-register-confirm-password"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold rounded-full"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>
        </Form>

        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            ℹ️ Você receberá um email de confirmação após se registrar.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Left Side - Background with Image and Form Card (Desktop) */}
      <div
        className="hidden md:flex md:w-full items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%),
                            url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=800&fit=crop')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-between px-12 py-12">
          {/* Left Content - Features & Background Text */}
          <div className="flex-1 text-white pr-12">
            <div className="mb-16">
              <div className="text-6xl font-bold mb-6 font-heading">Monitor IA</div>
              <div className="text-2xl text-slate-300 max-w-lg">
                Sistema Inteligente de Monitoramento e Gerenciamento de IAs
              </div>
            </div>

            <div className="space-y-8 max-w-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">🤖</div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg mb-1">Monitoramento em Tempo Real</h3>
                  <p className="text-base text-slate-400">Acompanhe o desempenho de suas IAs com precisão</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">📊</div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg mb-1">Análise Detalhada</h3>
                  <p className="text-base text-slate-400">Relatórios e métricas para melhorar resultados</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">🔒</div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg mb-1">Segurança Garantida</h3>
                  <p className="text-base text-slate-400">Proteção de dados com os melhores padrões</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Form Card - Compact and centered */}
          <div className="flex items-center justify-center pr-8">
            <div className="w-96 bg-background/95 backdrop-blur-sm rounded-3xl p-10 border border-border/50 shadow-2xl flex flex-col justify-center">
              <FormContent />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View - Full screen with form card */}
      <div className="w-full md:hidden flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm bg-background rounded-2xl p-8 border border-border shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-heading">Monitor IA</h1>
            <p className="text-sm text-muted-foreground mt-2">Sistema de Monitoramento de IAs</p>
          </div>

          <FormContent />
        </div>
      </div>
    </div>
  );
}
