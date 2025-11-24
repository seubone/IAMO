import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";

// Get API base URL (default to current origin if not set)
const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    fetchProfile();
  }, [user?.id]);

  async function fetchProfile() {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🔄 Fetching profile for user:", user?.id);

      const { data, error: fetchError } = await supabase
        .from("user_profiles_simonia")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (fetchError) {
        // Profile doesn't exist yet, return null
        if (fetchError.code === "PGRST116") {
          console.log("ℹ️ Profile does not exist yet for user:", user?.id);
          setProfile(null);
          return;
        }
        console.error("❌ Fetch error:", fetchError);
        throw fetchError;
      }

      console.log("✅ Profile fetched:", data);
      setProfile(data);
    } catch (err: any) {
      console.error("Error fetching profile:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Update user profile
  async function updateProfile(updates: {
    name?: string;
    avatar_url?: string;
  }) {
    if (!user) return;

    try {
      setError(null);

      const payload = {
        user_id: user.id,
        ...updates,
      };

      const { error: upsertError } = await supabase
        .from("user_profiles_simonia")
        .upsert(payload, { onConflict: "user_id" });

      if (upsertError) throw upsertError;

      // Fetch updated profile
      await fetchProfile();
    } catch (err: any) {
      console.error("Error updating profile:", err.message);
      setError(err.message);
      throw err;
    }
  }

  // Upload avatar via backend (MCP optimized with RLS support)
  async function uploadAvatar(file: File): Promise<string> {
    if (!user) throw new Error("User not authenticated");

    try {
      setError(null);

      // Validate file
      const maxSizeMB = 5;
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }

      const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validMimes.includes(file.type)) {
        throw new Error("Only JPEG, PNG, WebP and GIF images are allowed");
      }

      console.log("📤 Uploading avatar via backend API:", { name: file.name, size: file.size, type: file.type });

      // Get auth token from localStorage (set during login)
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("User not authenticated - please login again");
      }

      // Upload via backend endpoint (uses service role key for RLS bypass)
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = getApiUrl();
      const uploadResponse = await fetch(`${apiUrl}/api/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${uploadResponse.statusText}`);
      }

      const { avatarUrl } = await uploadResponse.json();
      console.log("✅ Avatar uploaded and profile updated via backend:", avatarUrl);

      // Fetch updated profile
      await fetchProfile();

      return avatarUrl;
    } catch (err: any) {
      console.error("Error uploading avatar:", err.message);
      setError(err.message);
      throw err;
    }
  }

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  };
}
