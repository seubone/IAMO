import { supabase } from "./supabase";

/**
 * Initiate Google OAuth flow with Supabase
 * This will open a redirect to Google login
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await (supabase as any).auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message || "Erro ao iniciar login com Google");
    }

    return data;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

/**
 * Handle OAuth callback after Google redirect
 * This is called when the user is redirected back from Google
 */
export async function handleGoogleCallback() {
  try {
    // Get the session from Supabase (which includes the access token from Google)
    const {
      data: { session },
      error,
    } = await (supabase as any).auth.getSession();

    if (error || !session) {
      throw new Error(error?.message || "Falha ao obter sessão do Google");
    }

    const user = session.user;
    const accessToken = session.access_token;

    // Send the user data and token to our backend for local DB sync
    const response = await fetch("/api/auth/google-callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0],
      }),
    });

    if (!response.ok) {
      throw new Error("Erro ao processar autenticação com Google");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Google callback error:", error);
    throw error;
  }
}

/**
 * Sign out from both Supabase and local session
 */
export async function signOut() {
  try {
    const { error } = await (supabase as any).auth.signOut();
    if (error) {
      throw new Error(error.message || "Erro ao fazer logout");
    }
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}
