import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function initializeSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseInstance;
}

// Server client with service role (full access) - lazy loaded
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!supabaseInstance) {
      initializeSupabase();
    }
    return (supabaseInstance as any)[prop];
  }
});

// Verify JWT token from Supabase
export async function verifySupabaseToken(token: string) {
  if (!supabaseInstance) {
    initializeSupabase();
  }
  try {
    const { data, error } = await supabaseInstance!.auth.getUser(token);
    if (error) {
      return { user: null, error };
    }
    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}
