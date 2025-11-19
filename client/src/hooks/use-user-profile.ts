import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";

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

      const { data, error: fetchError } = await supabase
        .from("user_profiles_simonia")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (fetchError) {
        // Profile doesn't exist yet, return null
        if (fetchError.code === "PGRST116") {
          setProfile(null);
          return;
        }
        throw fetchError;
      }

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

      if (profile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("user_profiles_simonia")
          .update(updates)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from("user_profiles_simonia")
          .insert({
            user_id: user.id,
            ...updates,
          });

        if (insertError) throw insertError;
      }

      // Fetch updated profile
      await fetchProfile();
    } catch (err: any) {
      console.error("Error updating profile:", err.message);
      setError(err.message);
      throw err;
    }
  }

  // Upload avatar
  async function uploadAvatar(file: File): Promise<string> {
    if (!user) throw new Error("User not authenticated");

    try {
      setError(null);

      const filename = `avatars/${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(filename);

      return data.publicUrl;
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
