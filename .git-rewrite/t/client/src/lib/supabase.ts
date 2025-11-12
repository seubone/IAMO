import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy load Supabase client - credentials come from environment
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Get credentials from window if injected by server
  const supabaseUrl = (window as any).__SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = (window as any).__SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env"
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

// Export getter instead of direct instance
export const supabase = new Proxy(
  {},
  {
    get: (target, prop) => {
      const client = getSupabaseClient();
      return (client as any)[prop];
    },
  }
) as ReturnType<typeof createClient>;

// Helper to get current session
export async function getCurrentSession() {
  const client = getSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  return session;
}

// Helper to sign out
export async function signOut() {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  return { error };
}
