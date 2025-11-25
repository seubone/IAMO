/**
 * Instance Bot Status Service
 * Manages bot/IA pause and inactive status per WhatsApp instance number
 */

import { db } from "../config/db";
import { sql } from "drizzle-orm";

export type BotStatus = "active" | "paused" | "inactive";

export interface InstanceBotStatusData {
  id?: number;
  instance_id: string;
  instance_number: string;
  status: BotStatus;
  pause_reason?: string | null;
  inactive_reason?: string | null;
  paused_until?: Date | null;
  inactive_until?: Date | null;
  paused_at?: Date | null;
  inactive_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export class InstanceBotStatusService {
  /**
   * Get bot status for an instance number
   */
  static async getStatus(instanceNumber: string): Promise<InstanceBotStatusData | null> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_bot_status
        WHERE instance_number = ${instanceNumber}
      `);

      return result.rows[0] as InstanceBotStatusData || null;
    } catch (error: any) {
      console.error(`[bot-status] Failed to get status for ${instanceNumber}:`, error.message);
      throw new Error(`Failed to get bot status: ${error.message}`);
    }
  }

  /**
   * Get bot status for an instance ID
   */
  static async getStatusByInstanceId(instanceId: string): Promise<InstanceBotStatusData | null> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_bot_status
        WHERE instance_id = ${instanceId}
        LIMIT 1
      `);

      return result.rows[0] as InstanceBotStatusData || null;
    } catch (error: any) {
      console.error(`[bot-status] Failed to get status for instance ${instanceId}:`, error.message);
      throw new Error(`Failed to get bot status: ${error.message}`);
    }
  }

  /**
   * Create or get default bot status for an instance
   */
  static async getOrCreateStatus(
    instanceId: string,
    instanceNumber: string
  ): Promise<InstanceBotStatusData> {
    try {
      // Try to get existing status
      let result = await db.execute(sql`
        SELECT *
        FROM instance_bot_status
        WHERE instance_number = ${instanceNumber}
      `);

      if (result.rows.length > 0) {
        return result.rows[0] as InstanceBotStatusData;
      }

      // Create default active status
      result = await db.execute(sql`
        INSERT INTO instance_bot_status (
          instance_id,
          instance_number,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${instanceId},
          ${instanceNumber},
          'active',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `);

      return result.rows[0] as InstanceBotStatusData;
    } catch (error: any) {
      console.error(`[bot-status] Failed to get or create status:`, error.message);
      throw new Error(`Failed to get or create bot status: ${error.message}`);
    }
  }

  /**
   * Pause bot for an instance
   * @param instanceNumber WhatsApp instance number
   * @param duration Duration in milliseconds (null = indefinite)
   * @param reason Reason for pause
   */
  static async pauseBot(
    instanceNumber: string,
    duration: number | null = null,
    reason: string = "Paused by user"
  ): Promise<InstanceBotStatusData> {
    try {
      const pausedUntil = duration ? new Date(Date.now() + duration) : null;

      const result = await db.execute(sql`
        UPDATE instance_bot_status
        SET
          status = 'paused',
          pause_reason = ${reason},
          paused_at = CURRENT_TIMESTAMP,
          paused_until = ${pausedUntil ? sql`${pausedUntil}::timestamp with time zone` : null},
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(`Instance ${instanceNumber} not found`);
      }

      console.log(`[bot-status] Bot paused for ${instanceNumber}`, {
        duration: duration ? `${duration}ms` : "indefinite",
        reason,
      });

      return result.rows[0] as InstanceBotStatusData;
    } catch (error: any) {
      console.error(`[bot-status] Failed to pause bot:`, error.message);
      throw new Error(`Failed to pause bot: ${error.message}`);
    }
  }

  /**
   * Resume bot for an instance
   */
  static async resumeBot(instanceNumber: string): Promise<InstanceBotStatusData> {
    try {
      const result = await db.execute(sql`
        UPDATE instance_bot_status
        SET
          status = 'active',
          pause_reason = NULL,
          paused_at = NULL,
          paused_until = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(`Instance ${instanceNumber} not found`);
      }

      console.log(`[bot-status] Bot resumed for ${instanceNumber}`);
      return result.rows[0] as InstanceBotStatusData;
    } catch (error: any) {
      console.error(`[bot-status] Failed to resume bot:`, error.message);
      throw new Error(`Failed to resume bot: ${error.message}`);
    }
  }

  /**
   * Deactivate bot for an instance
   * @param instanceNumber WhatsApp instance number
   * @param duration Duration in milliseconds (null = indefinite)
   * @param reason Reason for deactivation
   */
  static async deactivateBot(
    instanceNumber: string,
    duration: number | null = null,
    reason: string = "Deactivated by user"
  ): Promise<InstanceBotStatusData> {
    try {
      const inactiveUntil = duration ? new Date(Date.now() + duration) : null;

      const result = await db.execute(sql`
        UPDATE instance_bot_status
        SET
          status = 'inactive',
          inactive_reason = ${reason},
          inactive_at = CURRENT_TIMESTAMP,
          inactive_until = ${inactiveUntil ? sql`${inactiveUntil}::timestamp with time zone` : null},
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(`Instance ${instanceNumber} not found`);
      }

      console.log(`[bot-status] Bot deactivated for ${instanceNumber}`, {
        duration: duration ? `${duration}ms` : "indefinite",
        reason,
      });

      return result.rows[0] as InstanceBotStatusData;
    } catch (error: any) {
      console.error(`[bot-status] Failed to deactivate bot:`, error.message);
      throw new Error(`Failed to deactivate bot: ${error.message}`);
    }
  }

  /**
   * Activate bot for an instance
   */
  static async activateBot(instanceNumber: string): Promise<InstanceBotStatusData> {
    try {
      const result = await db.execute(sql`
        UPDATE instance_bot_status
        SET
          status = 'active',
          inactive_reason = NULL,
          inactive_at = NULL,
          inactive_until = NULL,
          pause_reason = NULL,
          paused_at = NULL,
          paused_until = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(`Instance ${instanceNumber} not found`);
      }

      console.log(`[bot-status] Bot activated for ${instanceNumber}`);
      return result.rows[0] as InstanceBotStatusData;
    } catch (error: any) {
      console.error(`[bot-status] Failed to activate bot:`, error.message);
      throw new Error(`Failed to activate bot: ${error.message}`);
    }
  }

  /**
   * Get all paused instances
   */
  static async getPausedInstances(): Promise<InstanceBotStatusData[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_bot_status
        WHERE status = 'paused'
        ORDER BY paused_at DESC
      `);

      return result.rows as InstanceBotStatusData[];
    } catch (error: any) {
      console.error(`[bot-status] Failed to get paused instances:`, error.message);
      throw new Error(`Failed to get paused instances: ${error.message}`);
    }
  }

  /**
   * Get all inactive instances
   */
  static async getInactiveInstances(): Promise<InstanceBotStatusData[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_bot_status
        WHERE status = 'inactive'
        ORDER BY inactive_at DESC
      `);

      return result.rows as InstanceBotStatusData[];
    } catch (error: any) {
      console.error(`[bot-status] Failed to get inactive instances:`, error.message);
      throw new Error(`Failed to get inactive instances: ${error.message}`);
    }
  }

  /**
   * Get instances that need to be auto-resumed
   */
  static async getExpiredPauses(): Promise<InstanceBotStatusData[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_bot_status
        WHERE status = 'paused'
          AND paused_until IS NOT NULL
          AND paused_until <= CURRENT_TIMESTAMP
        ORDER BY paused_until ASC
      `);

      return result.rows as InstanceBotStatusData[];
    } catch (error: any) {
      console.error(`[bot-status] Failed to get expired pauses:`, error.message);
      throw new Error(`Failed to get expired pauses: ${error.message}`);
    }
  }

  /**
   * Check if bot is active for an instance
   */
  static async isBotActive(instanceNumber: string): Promise<boolean> {
    try {
      const status = await this.getStatus(instanceNumber);
      return status?.status === "active" || status === null; // Default to active if not found
    } catch {
      return true; // Default to active on error
    }
  }
}
