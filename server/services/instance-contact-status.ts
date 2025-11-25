/**
 * Instance Contact Status Service
 * Manages active/paused/inactive status for contacts per WhatsApp instance
 */

import { db } from "../config/db";
import { sql } from "drizzle-orm";

export type ContactStatus = "active" | "paused" | "inactive";

export interface InstanceContactStatusData {
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

export class InstanceContactStatusService {
  /**
   * Get contact status for a specific contact
   */
  static async getContactStatus(
    instanceNumber: string,
    contactJid: string
  ): Promise<InstanceContactStatusData | null> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_contact_status
        WHERE instance_number = ${instanceNumber}
          AND contact_jid = ${contactJid}
      `);

      return (result.rows[0] as InstanceContactStatusData) || null;
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to get status for ${contactJid}:`,
        error.message
      );
      throw new Error(`Failed to get contact status: ${error.message}`);
    }
  }

  /**
   * Get or create default contact status (defaults to 'active')
   */
  static async getOrCreateContactStatus(
    instanceId: string,
    instanceNumber: string,
    contactJid: string,
    contactName?: string
  ): Promise<InstanceContactStatusData> {
    try {
      // Try to get existing status
      let result = await db.execute(sql`
        SELECT *
        FROM instance_contact_status
        WHERE instance_number = ${instanceNumber}
          AND contact_jid = ${contactJid}
      `);

      if (result.rows.length > 0) {
        return result.rows[0] as InstanceContactStatusData;
      }

      // Create default active status
      result = await db.execute(sql`
        INSERT INTO instance_contact_status (
          instance_id,
          instance_number,
          contact_jid,
          contact_name,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${instanceId},
          ${instanceNumber},
          ${contactJid},
          ${contactName || null},
          'active',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `);

      return result.rows[0] as InstanceContactStatusData;
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to get or create status:`,
        error.message
      );
      throw new Error(`Failed to get or create contact status: ${error.message}`);
    }
  }

  /**
   * Get all contacts for an instance with their status
   */
  static async getInstanceContacts(
    instanceNumber: string
  ): Promise<InstanceContactStatusData[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_contact_status
        WHERE instance_number = ${instanceNumber}
        ORDER BY contact_name ASC
      `);

      return result.rows as InstanceContactStatusData[];
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to get instance contacts:`,
        error.message
      );
      throw new Error(`Failed to get instance contacts: ${error.message}`);
    }
  }

  /**
   * Pause contact for an instance
   */
  static async pauseContact(
    instanceNumber: string,
    contactJid: string,
    duration: number | null = null,
    reason: string = "Pausado pelo usuário"
  ): Promise<InstanceContactStatusData> {
    try {
      const pausedUntil = duration ? new Date(Date.now() + duration) : null;

      const result = await db.execute(sql`
        UPDATE instance_contact_status
        SET
          status = 'paused',
          pause_reason = ${reason},
          paused_at = CURRENT_TIMESTAMP,
          paused_until = ${pausedUntil ? sql`${pausedUntil}::timestamp with time zone` : null},
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
          AND contact_jid = ${contactJid}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(
          `Contato ${contactJid} não encontrado na instância ${instanceNumber}`
        );
      }

      console.log(
        `[contact-status] Contato pausado: ${instanceNumber}/${contactJid}`,
        {
          duration: duration ? `${duration}ms` : "indefinido",
          reason,
        }
      );

      return result.rows[0] as InstanceContactStatusData;
    } catch (error: any) {
      console.error(`[contact-status] Failed to pause contact:`, error.message);
      throw new Error(`Failed to pause contact: ${error.message}`);
    }
  }

  /**
   * Resume paused contact
   */
  static async resumeContact(
    instanceNumber: string,
    contactJid: string
  ): Promise<InstanceContactStatusData> {
    try {
      const result = await db.execute(sql`
        UPDATE instance_contact_status
        SET
          status = 'active',
          pause_reason = NULL,
          paused_at = NULL,
          paused_until = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
          AND contact_jid = ${contactJid}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(
          `Contato ${contactJid} não encontrado na instância ${instanceNumber}`
        );
      }

      console.log(
        `[contact-status] Contato retomado: ${instanceNumber}/${contactJid}`
      );

      return result.rows[0] as InstanceContactStatusData;
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to resume contact:`,
        error.message
      );
      throw new Error(`Failed to resume contact: ${error.message}`);
    }
  }

  /**
   * Deactivate contact
   */
  static async deactivateContact(
    instanceNumber: string,
    contactJid: string,
    duration: number | null = null,
    reason: string = "Desativado pelo usuário"
  ): Promise<InstanceContactStatusData> {
    try {
      const inactiveUntil = duration ? new Date(Date.now() + duration) : null;

      const result = await db.execute(sql`
        UPDATE instance_contact_status
        SET
          status = 'inactive',
          inactive_reason = ${reason},
          inactive_at = CURRENT_TIMESTAMP,
          inactive_until = ${inactiveUntil ? sql`${inactiveUntil}::timestamp with time zone` : null},
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
          AND contact_jid = ${contactJid}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(
          `Contato ${contactJid} não encontrado na instância ${instanceNumber}`
        );
      }

      console.log(
        `[contact-status] Contato desativado: ${instanceNumber}/${contactJid}`,
        {
          duration: duration ? `${duration}ms` : "indefinido",
          reason,
        }
      );

      return result.rows[0] as InstanceContactStatusData;
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to deactivate contact:`,
        error.message
      );
      throw new Error(`Failed to deactivate contact: ${error.message}`);
    }
  }

  /**
   * Activate contact
   */
  static async activateContact(
    instanceNumber: string,
    contactJid: string
  ): Promise<InstanceContactStatusData> {
    try {
      const result = await db.execute(sql`
        UPDATE instance_contact_status
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
          AND contact_jid = ${contactJid}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        throw new Error(
          `Contato ${contactJid} não encontrado na instância ${instanceNumber}`
        );
      }

      console.log(
        `[contact-status] Contato ativado: ${instanceNumber}/${contactJid}`
      );

      return result.rows[0] as InstanceContactStatusData;
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to activate contact:`,
        error.message
      );
      throw new Error(`Failed to activate contact: ${error.message}`);
    }
  }

  /**
   * Get all paused contacts for an instance
   */
  static async getPausedContacts(
    instanceNumber: string
  ): Promise<InstanceContactStatusData[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_contact_status
        WHERE instance_number = ${instanceNumber}
          AND status = 'paused'
        ORDER BY paused_at DESC
      `);

      return result.rows as InstanceContactStatusData[];
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to get paused contacts:`,
        error.message
      );
      throw new Error(`Failed to get paused contacts: ${error.message}`);
    }
  }

  /**
   * Get all inactive contacts for an instance
   */
  static async getInactiveContacts(
    instanceNumber: string
  ): Promise<InstanceContactStatusData[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_contact_status
        WHERE instance_number = ${instanceNumber}
          AND status = 'inactive'
        ORDER BY inactive_at DESC
      `);

      return result.rows as InstanceContactStatusData[];
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to get inactive contacts:`,
        error.message
      );
      throw new Error(`Failed to get inactive contacts: ${error.message}`);
    }
  }

  /**
   * Get active contacts for an instance
   */
  static async getActiveContacts(
    instanceNumber: string
  ): Promise<InstanceContactStatusData[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_contact_status
        WHERE instance_number = ${instanceNumber}
          AND status = 'active'
        ORDER BY contact_name ASC
      `);

      return result.rows as InstanceContactStatusData[];
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to get active contacts:`,
        error.message
      );
      throw new Error(`Failed to get active contacts: ${error.message}`);
    }
  }

  /**
   * Check if contact is active (for incoming message handling)
   */
  static async isContactActive(
    instanceNumber: string,
    contactJid: string
  ): Promise<boolean> {
    try {
      const status = await this.getContactStatus(instanceNumber, contactJid);
      // Default to active if not found
      return status?.status === "active" || status === null;
    } catch {
      return true; // Default to active on error
    }
  }

  /**
   * Update contact name
   */
  static async updateContactName(
    instanceNumber: string,
    contactJid: string,
    contactName: string
  ): Promise<InstanceContactStatusData> {
    try {
      const result = await db.execute(sql`
        UPDATE instance_contact_status
        SET
          contact_name = ${contactName},
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_number = ${instanceNumber}
          AND contact_jid = ${contactJid}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        // Create with new name if doesn't exist
        return this.getOrCreateContactStatus(
          "", // Will be fetched from instance lookup if needed
          instanceNumber,
          contactJid,
          contactName
        );
      }

      return result.rows[0] as InstanceContactStatusData;
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to update contact name:`,
        error.message
      );
      throw new Error(`Failed to update contact name: ${error.message}`);
    }
  }

  /**
   * Bulk create contacts for an instance (when initializing contacts)
   */
  static async bulkCreateContacts(
    instanceNumber: string,
    contacts: Array<{ jid: string; name?: string }>
  ): Promise<InstanceContactStatusData[]> {
    try {
      // Get instance_id from instance_number
      const instanceResult = await db.execute(sql`
        SELECT id FROM public."Instances"
        WHERE CAST(number AS VARCHAR) = ${instanceNumber}
        LIMIT 1
      `);

      if (instanceResult.rows.length === 0) {
        throw new Error(`Instância ${instanceNumber} não encontrada`);
      }

      const instanceId = (instanceResult.rows[0] as any).id;

      // Insert or ignore duplicates
      const result = await db.execute(sql`
        INSERT INTO instance_contact_status (
          instance_id,
          instance_number,
          contact_jid,
          contact_name,
          status,
          created_at,
          updated_at
        )
        VALUES ${sql.raw(
          contacts
            .map(
              (c) =>
                `('${instanceId}', '${instanceNumber}', '${c.jid}', '${c.name || null}', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
            )
            .join(",")
        )}
        ON CONFLICT (instance_number, contact_jid) DO NOTHING
        RETURNING *
      `);

      return result.rows as InstanceContactStatusData[];
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to bulk create contacts:`,
        error.message
      );
      throw new Error(`Failed to bulk create contacts: ${error.message}`);
    }
  }

  /**
   * Get contact count statistics for instance
   */
  static async getContactStats(instanceNumber: string): Promise<{
    total: number;
    active: number;
    paused: number;
    inactive: number;
  }> {
    try {
      const result = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
        FROM instance_contact_status
        WHERE instance_number = ${instanceNumber}
      `);

      const stats = result.rows[0] as any;
      return {
        total: parseInt(stats.total || "0"),
        active: parseInt(stats.active || "0"),
        paused: parseInt(stats.paused || "0"),
        inactive: parseInt(stats.inactive || "0"),
      };
    } catch (error: any) {
      console.error(
        `[contact-status] Failed to get contact stats:`,
        error.message
      );
      throw new Error(`Failed to get contact stats: ${error.message}`);
    }
  }
}
