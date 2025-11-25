/**
 * Instance Bot Status Types
 * Type definitions for bot pause/inactive status system
 */

export type BotStatus = "active" | "paused" | "inactive";

export interface InstanceBotStatusResponse {
  id: number;
  instance_id: string;
  instance_number: string;
  status: BotStatus;
  pause_reason?: string | null;
  inactive_reason?: string | null;
  paused_until?: string | null; // ISO timestamp
  inactive_until?: string | null; // ISO timestamp
  paused_at?: string | null; // ISO timestamp
  inactive_at?: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface PauseBotRequest {
  duration?: number | null; // milliseconds, null = indefinite
  reason?: string;
}

export interface DeactivateBotRequest {
  duration?: number | null; // milliseconds, null = indefinite
  reason?: string;
}

export interface InstanceWithBotStatus {
  id: string;
  name: string;
  number: string | null;
  ownerJid: string | null;
  profilePicUrl: string | null;
  profileName: string | null;
  connectionStatus: string;
  botStatus?: BotStatus;
  pausedUntil?: string | null;
  inactiveUntil?: string | null;
  pauseReason?: string | null;
  inactiveReason?: string | null;
}

export interface BotStatusSummary {
  activeCount: number;
  pausedCount: number;
  inactiveCount: number;
  expiredPausesCount: number;
}
