/**
 * IA Configuration Types
 * Types for managing IA/AI configurations and N8N workflows
 */

/**
 * N8N Workflow Configuration
 */
export interface N8NWorkflowConfig {
  workflowId: string;
  workflowName: string;
  webhookUrl?: string;
  triggerType: 'webhook' | 'schedule' | 'manual' | 'trigger_node' | 'other';
  lastExecutionTimestamp?: string;
  config?: Record<string, any>;
}

/**
 * IA Pause Schedule
 */
export interface IAPauseSchedule {
  pauseUntil?: string; // ISO timestamp
  pauseReason?: string;
  pausedAt?: string; // ISO timestamp when it was paused
}

/**
 * IA Configuration Form Data
 */
export interface IAConfigFormData {
  id: string;
  name: string;
  aiName?: string;
  consultantName?: string;
  description?: string;
  category?: 'sales' | 'support' | 'marketing' | 'billing' | 'onboarding' | 'other';
  avatarUrl?: string;
  status: 'active' | 'paused' | 'inactive';

  // N8N Configuration
  n8nWorkflowId?: string;
  n8nWorkflowName?: string;
  n8nWebhookUrl?: string;
  n8nTriggerType?: string;

  // Pause Schedule
  pauseUntil?: string;
  pauseReason?: string;

  // Message Formatting
  messagePrefixTemplate?: string;
  useAiPrefix?: boolean;
  useConsultantPrefix?: boolean;

  // Other
  modelVersion?: string;
  performanceScore?: number;
  tags?: string[];
}

/**
 * IA Display Name
 */
export interface IADisplayName {
  aiName: string;      // e.g., "Maria Luzia"
  consultantName: string; // e.g., "Maria luzia"
}

/**
 * Generate consultant name from AI name
 * Rule: Keep first name as is, make surname initial lowercase
 * "Maria Luzia" → "Maria luzia"
 */
export function generateConsultantNameFromAI(aiName: string): string {
  if (!aiName || typeof aiName !== 'string') {
    return '';
  }

  const trimmed = aiName.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length < 2) {
    return trimmed;
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const lastNameWithLowerInitial = lastName.charAt(0).toLowerCase() + lastName.slice(1);

  if (parts.length === 2) {
    return `${firstName} ${lastNameWithLowerInitial}`;
  }

  const middleNames = parts.slice(1, -1);
  return `${firstName} ${middleNames.join(' ')} ${lastNameWithLowerInitial}`;
}

/**
 * Format message with AI/Consultant prefix
 */
export function formatMessageWithAIPrefix(
  message: string,
  displayName: string,
  template: string = '*{name}:*\n'
): string {
  if (!displayName) {
    return message;
  }

  const prefix = template.replace('{name}', displayName);
  return prefix + message;
}

/**
 * Category options
 */
export const CATEGORY_OPTIONS = [
  { value: 'sales', label: '💼 Vendas', emoji: '💼' },
  { value: 'support', label: '🆘 Suporte', emoji: '🆘' },
  { value: 'marketing', label: '📢 Marketing', emoji: '📢' },
  { value: 'billing', label: '💳 Cobrança', emoji: '💳' },
  { value: 'onboarding', label: '🎯 Onboarding', emoji: '🎯' },
  { value: 'other', label: '📌 Outro', emoji: '📌' },
] as const;

/**
 * N8N Trigger type options
 */
export const N8N_TRIGGER_OPTIONS = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'schedule', label: 'Agendado' },
  { value: 'manual', label: 'Manual' },
  { value: 'trigger_node', label: 'Nó Trigger' },
  { value: 'other', label: 'Outro' },
] as const;

/**
 * Message prefix template suggestions
 */
export const PREFIX_TEMPLATE_SUGGESTIONS = [
  { value: '*{name}:*\n', label: '**Nome:** (negrito com quebra)', example: '*Maria Luzia:*\nOlá!' },
  { value: '[{name}]\n', label: '[Nome] (com quebra)', example: '[Maria Luzia]\nOlá!' },
  { value: '{name}: ', label: 'Nome: (simples)', example: 'Maria Luzia: Olá!' },
  { value: '**{name}**: ', label: '**Nome**: (negrito)', example: '**Maria Luzia**: Olá!' },
  { value: '→ {name}: ', label: '→ Nome: (com seta)', example: '→ Maria Luzia: Olá!' },
] as const;
