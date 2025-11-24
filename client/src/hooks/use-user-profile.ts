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

  // Upload avatar via Supabase Storage (MCP optimized)
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

      // Generate unique path with timestamp + random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${timestamp}-${randomStr}.${ext}`;
      const filepath = `avatars/${user.id}/${filename}`;

      console.log("📤 Uploading avatar to Supabase Storage:", filepath);
      console.log("📊 File info:", { name: file.name, size: file.size, type: file.type });

      // Upload directly to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filepath, file, {
          upsert: false, // Don't overwrite, create new versions
          contentType: file.type
        });

      if (uploadError) {
        console.error("❌ Upload to storage failed:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log("✅ File uploaded to storage:", uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filepath);

      console.log("🔗 Public URL generated:", publicUrl);

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: publicUrl });

      console.log("✅ Avatar uploaded and profile updated successfully");
      return publicUrl;
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
