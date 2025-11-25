/**
 * Instance Contact Status Types
 * Shared types for contact status management
 */

export type ContactStatus = "active" | "paused" | "inactive";

export interface ContactStatusData {
  id?: number;
  instance_id: string;
  instance_number: string;
  contact_jid: string;
  contact_name?: string | null;
  status: ContactStatus;
  pause_reason?: string | null;
  inactive_reason?: string | null;
  paused_at?: Date | null;
  paused_until?: Date | null;
  inactive_at?: Date | null;
  inactive_until?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface PauseContactRequest {
  duration?: number | null; // milliseconds
  reason?: string;
}

export interface DeactivateContactRequest {
  duration?: number | null; // milliseconds
  reason?: string;
}

export interface ContactStatusResponse {
  success: boolean;
  message?: string;
  data?: ContactStatusData;
  error?: string;
  details?: string;
}

export interface ContactStatusListResponse {
  success: boolean;
  message?: string;
  data: ContactStatusData[];
  count: number;
  error?: string;
}

export interface ContactStatsResponse {
  success: boolean;
  message?: string;
  data: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
  };
  error?: string;
}

export interface CreateContactStatusRequest {
  contact_jid: string;
  contact_name?: string;
}

export interface BulkCreateContactsRequest {
  contacts: Array<{
    jid: string;
    name?: string;
  }>;
}
