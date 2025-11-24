/**
 * Instance N8N Workflows Service
 * Manages associations between Evolution instances and N8N workflows
 */

import { db } from "@/server/config/db";
import { sql } from "drizzle-orm";
import type {
  InstanceN8NWorkflow,
  CreateInstanceN8NWorkflowRequest,
  UpdateInstanceN8NWorkflowRequest,
} from "@shared/instance-workflow.types";

export class InstanceWorkflowsService {
  /**
   * Create a new workflow association for an instance
   */
  static async createWorkflow(
    data: CreateInstanceN8NWorkflowRequest
  ): Promise<InstanceN8NWorkflow> {
    try {
      const result = await db.execute(sql`
        INSERT INTO instance_n8n_workflows (
          instance_id,
          instance_number,
          workflow_id,
          workflow_name,
          webhook_url,
          trigger_type,
          config,
          is_active
        )
        VALUES (
          ${data.instance_id},
          ${data.instance_number},
          ${data.workflow_id},
          ${data.workflow_name},
          ${data.webhook_url || null},
          ${data.trigger_type || "webhook"},
          ${JSON.stringify(data.config || {})},
          true
        )
        RETURNING *;
      `);

      return result.rows[0] as InstanceN8NWorkflow;
    } catch (error: any) {
      throw new Error(
        `Failed to create workflow: ${error.message}`
      );
    }
  }

  /**
   * Get all workflows for a specific instance
   */
  static async getInstanceWorkflows(
    instanceId: string
  ): Promise<InstanceN8NWorkflow[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_n8n_workflows
        WHERE instance_id = ${instanceId}
        ORDER BY created_at DESC;
      `);

      return result.rows as InstanceN8NWorkflow[];
    } catch (error: any) {
      throw new Error(
        `Failed to fetch workflows: ${error.message}`
      );
    }
  }

  /**
   * Get all workflows for an instance by instance number
   */
  static async getInstanceWorkflowsByNumber(
    instanceNumber: string
  ): Promise<InstanceN8NWorkflow[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_n8n_workflows
        WHERE instance_number = ${instanceNumber}
        ORDER BY created_at DESC;
      `);

      return result.rows as InstanceN8NWorkflow[];
    } catch (error: any) {
      throw new Error(
        `Failed to fetch workflows: ${error.message}`
      );
    }
  }

  /**
   * Get a specific workflow
   */
  static async getWorkflow(
    instanceId: string,
    workflowId: string
  ): Promise<InstanceN8NWorkflow | null> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_n8n_workflows
        WHERE instance_id = ${instanceId}
        AND workflow_id = ${workflowId}
        LIMIT 1;
      `);

      return result.rows[0] as InstanceN8NWorkflow || null;
    } catch (error: any) {
      throw new Error(
        `Failed to fetch workflow: ${error.message}`
      );
    }
  }

  /**
   * Update a workflow configuration
   */
  static async updateWorkflow(
    instanceId: string,
    workflowId: string,
    data: UpdateInstanceN8NWorkflowRequest
  ): Promise<InstanceN8NWorkflow> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.workflow_name !== undefined) {
        updates.push("workflow_name = $" + (values.length + 1));
        values.push(data.workflow_name);
      }

      if (data.webhook_url !== undefined) {
        updates.push("webhook_url = $" + (values.length + 1));
        values.push(data.webhook_url);
      }

      if (data.trigger_type !== undefined) {
        updates.push("trigger_type = $" + (values.length + 1));
        values.push(data.trigger_type);
      }

      if (data.is_active !== undefined) {
        updates.push("is_active = $" + (values.length + 1));
        values.push(data.is_active);
      }

      if (data.config !== undefined) {
        updates.push("config = $" + (values.length + 1));
        values.push(JSON.stringify(data.config));
      }

      if (updates.length === 0) {
        const existing = await this.getWorkflow(instanceId, workflowId);
        if (!existing) throw new Error("Workflow not found");
        return existing;
      }

      const result = await db.execute(sql`
        UPDATE instance_n8n_workflows
        SET ${sql.raw(updates.join(", "))}
        WHERE instance_id = ${instanceId}
        AND workflow_id = ${workflowId}
        RETURNING *;
      `);

      if (result.rows.length === 0) {
        throw new Error("Workflow not found");
      }

      return result.rows[0] as InstanceN8NWorkflow;
    } catch (error: any) {
      throw new Error(
        `Failed to update workflow: ${error.message}`
      );
    }
  }

  /**
   * Delete a workflow association
   */
  static async deleteWorkflow(
    instanceId: string,
    workflowId: string
  ): Promise<void> {
    try {
      const result = await db.execute(sql`
        DELETE FROM instance_n8n_workflows
        WHERE instance_id = ${instanceId}
        AND workflow_id = ${workflowId};
      `);

      if (result.rowCount === 0) {
        throw new Error("Workflow not found");
      }
    } catch (error: any) {
      throw new Error(
        `Failed to delete workflow: ${error.message}`
      );
    }
  }

  /**
   * Log workflow execution
   */
  static async logExecution(
    instanceNumber: string,
    workflowId: string,
    status: "pending" | "success" | "failed" | "timeout",
    response?: Record<string, any>,
    error?: string,
    durationMs?: number
  ): Promise<void> {
    try {
      // Update last_triggered_at and last_error info
      const updates: any[] = [];

      if (status === "success") {
        updates.push("last_triggered_at = CURRENT_TIMESTAMP");
      } else if (status === "failed" || status === "timeout") {
        updates.push("last_error_message = $1");
        updates.push("last_error_at = CURRENT_TIMESTAMP");
      }

      if (updates.length > 0) {
        await db.execute(sql`
          UPDATE instance_n8n_workflows
          SET ${sql.raw(updates.join(", "))}
          WHERE instance_number = ${instanceNumber}
          AND workflow_id = ${workflowId};
        `);
      }

      // You can add a separate execution_logs table here if needed
      console.log(
        `📊 Workflow Execution Log: ${instanceNumber} / ${workflowId} - ${status}`,
        { error, durationMs }
      );
    } catch (error: any) {
      console.error("Failed to log workflow execution:", error);
    }
  }

  /**
   * Get active workflows for an instance
   */
  static async getActiveWorkflows(
    instanceNumber: string
  ): Promise<InstanceN8NWorkflow[]> {
    try {
      const result = await db.execute(sql`
        SELECT *
        FROM instance_n8n_workflows
        WHERE instance_number = ${instanceNumber}
        AND is_active = true
        ORDER BY created_at DESC;
      `);

      return result.rows as InstanceN8NWorkflow[];
    } catch (error: any) {
      throw new Error(
        `Failed to fetch active workflows: ${error.message}`
      );
    }
  }

  /**
   * Check if an instance has any active workflows
   */
  static async hasActiveWorkflows(
    instanceNumber: string
  ): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM instance_n8n_workflows
        WHERE instance_number = ${instanceNumber}
        AND is_active = true;
      `);

      const count = (result.rows[0] as any)?.count || 0;
      return count > 0;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Delete all workflows for an instance
   */
  static async deleteInstanceWorkflows(
    instanceNumber: string
  ): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM instance_n8n_workflows
        WHERE instance_number = ${instanceNumber};
      `);
    } catch (error: any) {
      console.error("Failed to delete instance workflows:", error);
    }
  }
}
