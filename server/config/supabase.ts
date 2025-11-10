import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

// Server client with service role (full access)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify JWT token from Supabase
export async function verifySupabaseToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      return { user: null, error };
    }
    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}
