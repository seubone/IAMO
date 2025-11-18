import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function initializeBotSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

// Lazy-loaded Supabase client
const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!supabaseInstance) {
      initializeBotSupabase();
    }
    return (supabaseInstance as any)[prop];
  }
});

/**
 * Interface for bot instance configuration
 */
export interface BotInstanceConfig {
  id?: number;
  instance_id: string;
  instance_number: string;
  instance_remote_jid?: string | null;
  has_bot_enabled: boolean;
  bot_name?: string | null;
  consultant_name?: string | null;
  bot_activity?: string | null;
  message_prefix_template: string;
  use_prefix_for_bot: boolean;
  use_prefix_for_consultant: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Generate consultant name from bot name
 * Example: "Maria Luzia" → "Maria luzia"
 * Rule: Keep first name uppercase, make surname initial lowercase
 * @param botName The bot's full name
 * @returns The consultant's name
 */
export function generateConsultantName(botName: string): string {
  if (!botName || typeof botName !== "string") {
    return botName || "";
  }

  const trimmed = botName.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length < 2) {
    return trimmed;
  }

  // Keep first name as is, make surname initial lowercase
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const lastNameWithLowerInitial = lastName.charAt(0).toLowerCase() + lastName.slice(1);

  // Reconstruct with middle names if any
  if (parts.length === 2) {
    return `${firstName} ${lastNameWithLowerInitial}`;
  }

  // Include middle names
  const middleNames = parts.slice(1, -1);
  return `${firstName} ${middleNames.join(" ")} ${lastNameWithLowerInitial}`;
}

/**
 * Format a message with the prefix template
 * @param message The original message
 * @param name The name to insert in the template
 * @param template The template string (e.g., "*{name}:*\n")
 * @returns Formatted message with prefix
 */
export function formatMessageWithPrefix(
  message: string,
  name: string | undefined | null,
  template: string = "*{name}:*\n"
): string {
  if (!name) {
    return message;
  }

  const prefix = template.replace("{name}", name);
  return prefix + message;
}

/**
 * Get bot instance configuration by instance number
 * @param instanceNumber The instance number
 * @returns Bot configuration or null if not found
 */
export async function getBotConfigByInstanceNumber(
  instanceNumber: string
): Promise<BotInstanceConfig | null> {
  try {
    const { data, error } = await supabase
      .from("bot_instances")
      .select("*")
      .eq("instance_number", instanceNumber)
      .maybeSingle();

    if (error) {
      console.error("Error fetching bot config:", error);
      return null;
    }

    return data as BotInstanceConfig | null;
  } catch (error) {
    console.error("Error in getBotConfigByInstanceNumber:", error);
    return null;
  }
}

/**
 * Get bot instance configuration by instance ID
 * @param instanceId The instance ID (UUID)
 * @returns Bot configuration or null if not found
 */
export async function getBotConfigByInstanceId(
  instanceId: string
): Promise<BotInstanceConfig | null> {
  try {
    const { data, error } = await supabase
      .from("bot_instances")
      .select("*")
      .eq("instance_id", instanceId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching bot config by ID:", error);
      return null;
    }

    return data as BotInstanceConfig | null;
  } catch (error) {
    console.error("Error in getBotConfigByInstanceId:", error);
    return null;
  }
}

/**
 * Create or update bot instance configuration
 * @param config The bot configuration to save
 * @returns The saved configuration
 */
export async function upsertBotConfig(config: BotInstanceConfig): Promise<BotInstanceConfig> {
  try {
    // Generate consultant name if bot name is provided
    let consultantName = config.consultant_name;
    if (config.bot_name && !consultantName) {
      consultantName = generateConsultantName(config.bot_name);
    }

    const payload = {
      instance_id: config.instance_id,
      instance_number: config.instance_number,
      instance_remote_jid: config.instance_remote_jid || null,
      has_bot_enabled: config.has_bot_enabled ?? false,
      bot_name: config.bot_name || null,
      consultant_name: consultantName || null,
      bot_activity: config.bot_activity || null,
      message_prefix_template: config.message_prefix_template || "*{name}:*\n",
      use_prefix_for_bot: config.use_prefix_for_bot ?? true,
      use_prefix_for_consultant: config.use_prefix_for_consultant ?? true,
    };

    const { data, error } = await supabase
      .from("bot_instances")
      .upsert(payload, {
        onConflict: "instance_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting bot config:", error);
      throw new Error(`Failed to save bot configuration: ${error.message}`);
    }

    return data as BotInstanceConfig;
  } catch (error) {
    console.error("Error in upsertBotConfig:", error);
    throw error;
  }
}

/**
 * Delete bot instance configuration
 * @param instanceNumber The instance number
 * @returns true if deleted, false if not found
 */
export async function deleteBotConfig(instanceNumber: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("bot_instances")
      .delete()
      .eq("instance_number", instanceNumber);

    if (error) {
      console.error("Error deleting bot config:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteBotConfig:", error);
    return false;
  }
}

/**
 * Get all bot configurations for enabled bots
 * @returns Array of enabled bot configurations
 */
export async function getAllEnabledBotConfigs(): Promise<BotInstanceConfig[]> {
  try {
    const { data, error } = await supabase
      .from("bot_instances")
      .select("*")
      .eq("has_bot_enabled", true);

    if (error) {
      console.error("Error fetching enabled bot configs:", error);
      return [];
    }

    return (data || []) as BotInstanceConfig[];
  } catch (error) {
    console.error("Error in getAllEnabledBotConfigs:", error);
    return [];
  }
}

/**
 * Check if instance has bot enabled
 * @param instanceNumber The instance number
 * @returns true if bot is enabled, false otherwise
 */
export async function isBotEnabledForInstance(instanceNumber: string): Promise<boolean> {
  try {
    const config = await getBotConfigByInstanceNumber(instanceNumber);
    return config?.has_bot_enabled ?? false;
  } catch (error) {
    console.error("Error in isBotEnabledForInstance:", error);
    return false;
  }
}

/**
 * Update only the bot enabled status
 * @param instanceNumber The instance number
 * @param enabled Whether to enable or disable the bot
 * @returns The updated configuration
 */
export async function setBotEnabledStatus(
  instanceNumber: string,
  enabled: boolean
): Promise<BotInstanceConfig | null> {
  try {
    const { data, error } = await supabase
      .from("bot_instances")
      .update({ has_bot_enabled: enabled })
      .eq("instance_number", instanceNumber)
      .select()
      .single();

    if (error) {
      console.error("Error updating bot enabled status:", error);
      return null;
    }

    return data as BotInstanceConfig;
  } catch (error) {
    console.error("Error in setBotEnabledStatus:", error);
    return null;
  }
}
