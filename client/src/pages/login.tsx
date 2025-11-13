import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/api";
import { signInWithGoogle } from "@/lib/google-auth";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
    email: z.string().email("Email invalido"),
    password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem",
    path: ["confirmPassword"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const Wordmark = ({ width, height, className }: { width: number; height: number; className?: string }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 154 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M41.8496 0.00196248C44.8849 0.111441 47.548 1.84847 48.7692 4.46653L48.8757 4.69359C49.6107 6.42695 49.7605 10.7224 49.7044 10.749C49.7639 12.5409 49.6565 14.8489 49.4163 17.4175C48.5746 17.5052 47.7843 17.7222 47.045 18.066C46.0752 18.5278 45.2772 19.1623 44.6538 19.9705V17.6502H39.806V31.9905C39.806 34.6678 41.9764 36.8382 44.6538 36.8382V26.2402C44.6538 24.7394 45.0358 23.5966 45.7976 22.8116C46.5734 22.0129 47.6197 21.6091 48.9367 21.5996C48.0036 28.5644 46.3275 36.3376 44.404 40.8614C44.3936 40.8894 43.6617 42.8512 43.0856 43.8274C42.2857 45.312 40.9792 46.4728 39.4612 47.1808C37.7669 47.9708 35.9502 48.1959 34.2133 47.8279C33.8754 47.7099 32.4825 47.3191 31.2941 46.904C23.9783 44.6333 9.88844 36.3795 4.34919 31.2043C3.485 30.4285 1.47117 28.3895 0.805634 27.1087C0.22156 25.8561 -0.0468059 24.5274 0.00666678 23.1152C0.161474 21.3137 0.916831 19.5743 2.14387 18.242C3.01045 17.3485 5.87118 15.2539 5.92726 15.2278C9.08516 12.9951 14.5291 10.0391 20.7216 7.15151C26.6221 4.40006 32.1583 2.23591 35.8978 1.11456C35.9854 1.14562 40.1898 -0.0549616 41.8496 0.00196248ZM85.1215 17.338C86.9688 17.338 88.6429 17.7541 90.1438 18.5854C91.6447 19.3936 92.8231 20.5486 93.6774 22.0495C94.5546 23.5502 94.9929 25.2825 94.9929 27.2449C94.9929 29.2074 94.5424 30.9396 93.6419 32.4403C92.7645 33.941 91.564 35.1073 90.0402 35.9385C88.5393 36.7466 86.8528 37.1504 84.9824 37.1504C83.1356 37.1503 81.4732 36.7464 79.9956 35.9385C78.518 35.1073 77.3518 33.9409 76.4975 32.4403C75.6663 30.9396 75.2502 29.2074 75.2501 27.2449C75.2501 25.2824 75.6774 23.5503 76.5316 22.0495C77.409 20.5486 78.5984 19.3936 80.0992 18.5854C81.6001 17.7541 83.2743 17.338 85.1215 17.338ZM16.2982 12.3157C14.6358 12.3158 13.1579 12.6041 11.8649 13.1814C10.5718 13.7356 9.56789 14.5445 8.85207 15.6067C8.13625 16.6688 7.77779 17.9158 7.77779 19.3475C7.77783 20.8712 8.12401 22.0952 8.81659 23.0187C9.5324 23.9193 10.3757 24.6005 11.3455 25.0623C12.3383 25.501 13.6198 25.9515 15.1899 26.4133C16.3443 26.7365 17.2454 27.036 17.8919 27.313C18.5615 27.567 19.1164 27.9255 19.5551 28.3873C19.9936 28.8491 20.2122 29.4385 20.2122 30.1541C20.2121 31.0314 19.8893 31.7471 19.2429 32.3012C18.5965 32.8322 17.7075 33.0973 16.5764 33.0974C15.4681 33.0974 14.5904 32.8089 13.9439 32.2317C13.3206 31.6546 12.9731 30.87 12.9037 29.8774H7.70826C7.73146 31.3549 8.13664 32.6367 8.92161 33.7218C9.70666 34.8068 10.7685 35.638 12.1075 36.2152C13.4699 36.7925 14.9943 37.0809 16.68 37.0809C18.4578 37.0808 19.9934 36.7581 21.2864 36.1116C22.5795 35.442 23.5601 34.552 24.2297 33.4436C24.8993 32.3353 25.2344 31.1349 25.2344 29.8419C25.2344 28.3411 24.8774 27.1283 24.1616 26.2047C23.4459 25.2813 22.5913 24.5889 21.5987 24.1271C20.6057 23.6653 19.323 23.2038 17.7528 22.742C16.5987 22.3958 15.6987 22.0948 15.0522 21.8409C14.4288 21.5638 13.8973 21.2177 13.4586 20.8021C13.043 20.3634 12.8356 19.8208 12.8356 19.1743C12.8356 18.2509 13.1118 17.5462 13.6657 17.0613C14.243 16.5764 15.0054 16.3333 15.952 16.3333C17.0372 16.3333 17.9038 16.6107 18.5504 17.1649C19.2198 17.6959 19.577 18.3773 19.6232 19.2084H24.9577C24.796 17.038 23.9294 15.3527 22.3593 14.1521C20.8122 12.9284 18.7919 12.3157 16.2982 12.3157ZM29.8026 17.6502V31.989C29.8026 34.6671 31.9736 36.8382 34.6518 36.8382V17.6502H29.8026ZM63.6346 17.3735C65.9897 17.3735 67.8837 18.1002 69.3153 19.5547C70.77 20.9863 71.4979 22.9955 71.4979 25.5817V36.8382C68.8198 36.8382 66.6488 34.6671 66.6488 31.989V26.2402C66.6488 24.7393 66.2669 23.5966 65.505 22.8116C64.743 22.0034 63.7046 21.5983 62.3886 21.5982C61.0724 21.5982 60.0218 22.0034 59.2367 22.8116C58.4748 23.5966 58.0929 24.7394 58.0929 26.2402V36.8382C55.4148 36.8382 53.2437 34.6671 53.2437 31.989V26.2402C53.2437 24.7395 52.8631 23.5966 52.1013 22.8116C51.3393 22.0034 50.2997 21.5982 48.9835 21.5982C48.9679 21.5982 48.9523 21.5995 48.9367 21.5996C49.1297 20.159 49.2915 18.7531 49.4163 17.4175C49.7049 17.3874 49.9998 17.3735 50.3005 17.3735C51.8012 17.3735 53.1404 17.6962 54.318 18.3427C55.4956 18.9662 56.4075 19.8671 57.0541 21.0447C57.6775 19.9364 58.5784 19.0464 59.7561 18.3768C60.9565 17.7074 62.2495 17.3736 63.6346 17.3735ZM109.546 17.3735C111.832 17.3735 113.679 18.1003 115.088 19.5547C116.496 20.9863 117.201 22.9955 117.201 25.5817V36.8382C114.523 36.8382 112.352 34.6671 112.352 31.989V26.2402C112.352 24.7164 111.971 23.5502 111.209 22.742C110.447 21.9107 109.408 21.4946 108.091 21.4946C106.752 21.4947 105.691 21.9108 104.906 22.742C104.144 23.5502 103.762 24.7162 103.762 26.2402V36.8382C101.084 36.8382 98.9126 34.6671 98.9126 31.989V17.6502H103.762V20.04C104.408 19.2088 105.228 18.5619 106.221 18.1001C107.237 17.6152 108.346 17.3735 109.546 17.3735ZM127.025 36.8382C124.347 36.8382 122.176 34.6671 122.176 31.989V12.662H127.025V36.8382ZM153.723 36.8382H148.596L147.004 32.2317H137.375L135.781 36.8382H130.69L139.383 12.6279H145.028L153.723 36.8382ZM85.052 21.5641C83.6667 21.5642 82.5005 22.0601 81.5538 23.0528C80.6302 24.0226 80.1688 25.4207 80.1688 27.2449C80.1689 29.0688 80.6193 30.4768 81.5198 31.4696C82.4433 32.4393 83.5973 32.9241 84.9824 32.9242C85.8598 32.9242 86.6799 32.7168 87.4418 32.3012C88.2269 31.8625 88.8504 31.2157 89.3122 30.3613C89.7739 29.5071 90.0047 28.4684 90.0047 27.2449C90.0047 25.4207 89.5199 24.0226 88.5501 23.0528C87.6035 22.0602 86.4372 21.5641 85.052 21.5641ZM138.691 28.3532H145.687L142.189 18.2391L138.691 28.3532ZM32.2605 9.68323C31.4065 9.68339 30.6905 9.96081 30.1134 10.5148C29.5593 11.0459 29.2832 11.7162 29.2832 12.5243C29.2833 13.3323 29.5593 14.0138 30.1134 14.5679C30.6905 15.0988 31.4065 15.3638 32.2605 15.364C33.1147 15.364 33.8195 15.0987 34.3736 14.5679C34.9508 14.0138 35.2392 13.3323 35.2393 12.5243C35.2393 11.7161 34.9509 11.0459 34.3736 10.5148C33.8195 9.96085 33.1148 9.68323 32.2605 9.68323Z"
      fill="currentColor"
    />
  </svg>
);

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

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

  async function onGoogleSignIn() {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // The user will be redirected to Google login, then back to /auth/callback
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao conectar com Google";
      toast({
        variant: "destructive",
        title: "Erro ao fazer login com Google",
        description: errorMessage,
      });
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
          title: "Cadastro enviado!",
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

  const handleForgotPassword = () => {
    toast({
      title: "Recuperacao de senha",
      description: "Entre em contato com um administrador para redefinir suas credenciais.",
    });
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="relative hidden overflow-hidden lg:flex lg:w-[65%] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <div className="absolute inset-0 bg-slate-950/30" aria-hidden="true" />
      </div>

      <div className="relative z-[1] flex w-full items-center justify-center bg-background p-6 lg:w-[35%]">
        <div className="w-full max-w-sm">
          <div className="w-full">
            {!isRegisterMode ? (
              <div key="login-form" className="space-y-6">
                <div className="flex justify-center mb-2">
                  <Wordmark width={70} height={21} className="text-primary" />
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-2 font-heading text-slate-900 dark:text-slate-100">Bem-vindo de volta!</h2>
                  <p className="text-sm text-muted-foreground">Entre com suas credenciais para acessar o painel</p>
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
                              className="h-11 bg-white/80 dark:bg-slate-900/80 border border-border placeholder:text-slate-500 dark:placeholder:text-slate-400"
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
                              placeholder="Sua senha"
                              {...field}
                              data-testid="input-login-password"
                              className="h-11 bg-white/80 dark:bg-slate-900/80 border border-border placeholder:text-slate-500 dark:placeholder:text-slate-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Checkbox id="remember-me" />
                        <label htmlFor="remember-me" className="cursor-pointer leading-none text-muted-foreground">
                          Lembrar-me
                        </label>
                      </div>
                      <button type="button" onClick={handleForgotPassword} className="text-primary hover:underline">
                        Esqueceu a senha?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-full text-base font-semibold"
                      disabled={isLoading}
                      data-testid="button-login"
                    >
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </Form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-11 rounded-full text-base font-semibold bg-white dark:bg-slate-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-300 dark:border-slate-700"
                  onClick={onGoogleSignIn}
                  disabled={isLoading}
                  data-testid="button-google-login"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    {/* Blue path */}
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    {/* Green path */}
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    {/* Red path */}
                    <path
                      fill="#EA4335"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    {/* Yellow path */}
                    <path
                      fill="#FBBC05"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Entrar com Google
                </Button>

                <div className="text-center text-sm">
                  <p className="text-muted-foreground">
                    Ainda nao tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className="text-primary font-semibold hover:underline"
                    >
                      Registre-se aqui
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div key="register-form" className="space-y-6">
                <div className="flex justify-center mb-2">
                  <Wordmark width={70} height={21} className="text-primary" />
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-2 font-heading text-slate-900 dark:text-slate-100">Comece agora!</h2>
                  <p className="text-sm text-muted-foreground">Crie sua conta e comece a monitorar suas IAs</p>
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
                              autoComplete="new-password"
                              data-testid="input-register-name"
                              className="h-11 bg-white/80 dark:bg-slate-900/80 border border-border placeholder:text-slate-500 dark:placeholder:text-slate-400"
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
                              autoComplete="new-password"
                              data-testid="input-register-email"
                              className="h-11 bg-white/80 dark:bg-slate-900/80 border border-border placeholder:text-slate-500 dark:placeholder:text-slate-400"
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
                              placeholder="Crie uma senha"
                              {...field}
                              data-testid="input-register-password"
                              className="h-11 bg-white/80 dark:bg-slate-900/80 border border-border placeholder:text-slate-500 dark:placeholder:text-slate-400"
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
                              placeholder="Confirme sua senha"
                              {...field}
                              data-testid="input-register-confirm-password"
                              className="h-11 bg-white/80 dark:bg-slate-900/80 border border-border placeholder:text-slate-500 dark:placeholder:text-slate-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-full text-base font-semibold"
                      disabled={isLoading}
                      data-testid="button-register"
                    >
                      {isLoading ? "Criando conta..." : "Criar Conta"}
                    </Button>
                  </form>
                </Form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-11 rounded-full text-base font-semibold bg-white dark:bg-slate-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-300 dark:border-slate-700"
                  onClick={onGoogleSignIn}
                  disabled={isLoading}
                  data-testid="button-google-register"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    {/* Blue path */}
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    {/* Green path */}
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    {/* Red path */}
                    <path
                      fill="#EA4335"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    {/* Yellow path */}
                    <path
                      fill="#FBBC05"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Registrar-se com Google
                </Button>

                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Confirmacao por email</p>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Voce recebera um email de confirmacao apos se registrar. Pode levar alguns minutos para chegar.
                  </p>
                </div>

                <div className="text-center text-sm">
                  <p className="text-muted-foreground">
                    Ja tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(false)}
                      className="text-primary font-semibold hover:underline"
                    >
                      Faca login aqui
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
