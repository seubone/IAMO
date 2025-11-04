/**
 * Bot Instance Configuration Types
 * Manages AI/Bot configuration for WhatsApp instances
 */

/**
 * Bot instance configuration stored in the database
 */
export interface BotInstanceConfig {
  id?: number;
  instance_id: string;
  instance_number: string;
  instance_remote_jid?: string | null;
  has_bot_enabled: boolean;
  bot_paused: boolean; // Novo campo para estado de pausa
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
 * Message with prefix information
 */
export interface MessageWithPrefix {
  originalMessage: string;
  formattedMessage: string;
  senderType: "bot" | "consultant" | "user";
  senderName?: string;
  usedPrefix: boolean;
}

/**
 * Bot status and information
 */
export interface BotStatus {
  instanceNumber: string;
  isEnabled: boolean;
  botName?: string;
  consultantName?: string;
  activity?: string;
  lastUpdated: string;
}

/**
 * Form data for bot configuration
 */
export interface BotConfigFormData {
  instanceNumber: string;
  instanceId: string;
  hasBot: boolean;
  botName?: string;
  consultantName?: string;
  botActivity?: string;
  messagePrefixTemplate?: string;
  usePrefixForBot?: boolean;
  usePrefixForConsultant?: boolean;
}

/**
 * Preview of formatted messages
 */
export interface MessagePreview {
  botMessage: string;
  consultantMessage: string;
  template: string;
}

/**
 * Historical change of bot configuration (for audit trail - future feature)
 */
export interface BotConfigHistory {
  id: number;
  instance_id: string;
  instance_number: string;
  changed_by: string; // user ID
  previous_config: Partial<BotInstanceConfig>;
  new_config: Partial<BotInstanceConfig>;
  change_type: "create" | "update" | "delete";
  changed_at: string;
  reason?: string;
}
