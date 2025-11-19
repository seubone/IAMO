-- Create user_profiles_simonia table for storing user profile data
-- This table extends auth.users with additional profile information

CREATE TABLE IF NOT EXISTS public.user_profiles_simonia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_simonia_user_id
  ON public.user_profiles_simonia(user_id);

-- Create index for listing by creation date
CREATE INDEX IF NOT EXISTS idx_user_profiles_simonia_created_at
  ON public.user_profiles_simonia(created_at DESC);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_simonia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_profiles_simonia_updated_at
  ON public.user_profiles_simonia;

CREATE TRIGGER trigger_update_user_profiles_simonia_updated_at
  BEFORE UPDATE ON public.user_profiles_simonia
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_simonia_updated_at();

-- Enable Row Level Security
ALTER TABLE public.user_profiles_simonia ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles_simonia;
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles_simonia
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles_simonia;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles_simonia
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles_simonia;
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles_simonia
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles_simonia;
CREATE POLICY "Users can delete their own profile"
  ON public.user_profiles_simonia
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles_simonia TO authenticated;
GRANT SELECT ON public.user_profiles_simonia TO anon;
