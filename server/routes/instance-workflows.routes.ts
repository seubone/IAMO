/**
 * Instance N8N Workflows Routes
 * API endpoints for managing N8N workflows per Evolution instance
 */

import { Router, Request, Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { InstanceWorkflowsService } from "../services/instance-workflows";
import type {
  CreateInstanceN8NWorkflowRequest,
  UpdateInstanceN8NWorkflowRequest,
  InstanceWorkflowResponse,
  InstanceWorkflowListResponse,
} from "../../shared/instance-workflow.types";

const router = Router();

// Middleware to add auth to routes
router.use(authMiddleware);

/**
 * GET /api/instances/:instanceNumber/workflows
 * List all workflows for an instance
 */
router.get("/:instanceNumber/workflows", async (req: AuthRequest, res: Response) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        success: false,
        message: "Instance number is required",
        data: [],
        count: 0,
      } as InstanceWorkflowListResponse);
    }

    const workflows = await InstanceWorkflowsService.getInstanceWorkflowsByNumber(
      instanceNumber
    );

    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
    } as InstanceWorkflowListResponse);
  } catch (error: any) {
    console.error("❌ Error fetching workflows:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workflows",
      data: [],
      count: 0,
      error: error.message,
    } as InstanceWorkflowListResponse);
  }
});

/**
 * GET /api/instances/:instanceNumber/workflows/active
 * List only active workflows for an instance
 */
router.get("/:instanceNumber/workflows/active", async (req: AuthRequest, res: Response) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        success: false,
        message: "Instance number is required",
        data: [],
        count: 0,
      } as InstanceWorkflowListResponse);
    }

    const workflows = await InstanceWorkflowsService.getActiveWorkflows(instanceNumber);

    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
    } as InstanceWorkflowListResponse);
  } catch (error: any) {
    console.error("❌ Error fetching active workflows:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active workflows",
      data: [],
      count: 0,
      error: error.message,
    } as InstanceWorkflowListResponse);
  }
});

/**
 * POST /api/instances/:instanceNumber/workflows
 * Create a new workflow association for an instance
 */
router.post("/:instanceNumber/workflows", async (req: AuthRequest, res: Response) => {
  try {
    const { instanceNumber } = req.params;
    const {
      instance_id,
      workflow_id,
      workflow_name,
      webhook_url,
      trigger_type,
      config,
    } = req.body as CreateInstanceN8NWorkflowRequest;

    // Validation
    if (!instance_id || !workflow_id || !workflow_name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: instance_id, workflow_id, workflow_name",
        error: "Validation error",
      } as InstanceWorkflowResponse);
    }

    const workflow = await InstanceWorkflowsService.createWorkflow({
      instance_id,
      instance_number: instanceNumber,
      workflow_id,
      workflow_name,
      webhook_url,
      trigger_type: trigger_type || "webhook",
      config,
    });

    console.log(`✅ Workflow created for instance ${instanceNumber}:`, workflow_id);

    res.status(201).json({
      success: true,
      message: "Workflow associated with instance successfully",
      data: workflow,
    } as InstanceWorkflowResponse);
  } catch (error: any) {
    console.error("❌ Error creating workflow:", error);

    // Handle unique constraint violation
    if (error.message.includes("duplicate key")) {
      return res.status(409).json({
        success: false,
        message: "This workflow is already associated with this instance",
        error: error.message,
      } as InstanceWorkflowResponse);
    }

    res.status(500).json({
      success: false,
      message: "Failed to create workflow",
      error: error.message,
    } as InstanceWorkflowResponse);
  }
});

/**
 * GET /api/instances/:instanceNumber/workflows/:workflowId
 * Get a specific workflow
 */
router.get("/:instanceNumber/workflows/:workflowId", async (req: AuthRequest, res: Response) => {
  try {
    const { instanceNumber, workflowId } = req.params;

    if (!instanceNumber || !workflowId) {
      return res.status(400).json({
        success: false,
        message: "Instance number and workflow ID are required",
      } as InstanceWorkflowResponse);
    }

    // First get instance_id from instanceNumber
    const workflows = await InstanceWorkflowsService.getInstanceWorkflowsByNumber(instanceNumber);
    const workflow = workflows.find((w) => w.workflow_id === workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found for this instance",
      } as InstanceWorkflowResponse);
    }

    res.json({
      success: true,
      message: "Workflow retrieved successfully",
      data: workflow,
    } as InstanceWorkflowResponse);
  } catch (error: any) {
    console.error("❌ Error fetching workflow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workflow",
      error: error.message,
    } as InstanceWorkflowResponse);
  }
});

/**
 * PATCH /api/instances/:instanceNumber/workflows/:workflowId
 * Update a workflow configuration
 */
router.patch("/:instanceNumber/workflows/:workflowId", async (req: AuthRequest, res: Response) => {
  try {
    const { instanceNumber, workflowId } = req.params;
    const updates = req.body as UpdateInstanceN8NWorkflowRequest;

    if (!instanceNumber || !workflowId) {
      return res.status(400).json({
        success: false,
        message: "Instance number and workflow ID are required",
      } as InstanceWorkflowResponse);
    }

    // First get instance_id from instanceNumber
    const workflows = await InstanceWorkflowsService.getInstanceWorkflowsByNumber(instanceNumber);
    const existingWorkflow = workflows.find((w) => w.workflow_id === workflowId);

    if (!existingWorkflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found for this instance",
      } as InstanceWorkflowResponse);
    }

    const workflow = await InstanceWorkflowsService.updateWorkflow(
      existingWorkflow.instance_id,
      workflowId,
      updates
    );

    console.log(`✅ Workflow updated for instance ${instanceNumber}:`, workflowId);

    res.json({
      success: true,
      message: "Workflow updated successfully",
      data: workflow,
    } as InstanceWorkflowResponse);
  } catch (error: any) {
    console.error("❌ Error updating workflow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workflow",
      error: error.message,
    } as InstanceWorkflowResponse);
  }
});

/**
 * DELETE /api/instances/:instanceNumber/workflows/:workflowId
 * Delete a workflow association
 */
router.delete("/:instanceNumber/workflows/:workflowId", async (req: AuthRequest, res: Response) => {
  try {
    const { instanceNumber, workflowId } = req.params;

    if (!instanceNumber || !workflowId) {
      return res.status(400).json({
        success: false,
        message: "Instance number and workflow ID are required",
      } as InstanceWorkflowResponse);
    }

    // First get instance_id from instanceNumber
    const workflows = await InstanceWorkflowsService.getInstanceWorkflowsByNumber(instanceNumber);
    const existingWorkflow = workflows.find((w) => w.workflow_id === workflowId);

    if (!existingWorkflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found for this instance",
      } as InstanceWorkflowResponse);
    }

    await InstanceWorkflowsService.deleteWorkflow(
      existingWorkflow.instance_id,
      workflowId
    );

    console.log(`✅ Workflow deleted for instance ${instanceNumber}:`, workflowId);

    res.json({
      success: true,
      message: "Workflow dissociated from instance successfully",
    } as InstanceWorkflowResponse);
  } catch (error: any) {
    console.error("❌ Error deleting workflow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete workflow",
      error: error.message,
    } as InstanceWorkflowResponse);
  }
});

/**
 * POST /api/instances/:instanceNumber/workflows/:workflowId/trigger
 * Manually trigger a workflow for an instance
 */
router.post(
  "/:instanceNumber/workflows/:workflowId/trigger",
  async (req: AuthRequest, res: Response) => {
    try {
      const { instanceNumber, workflowId } = req.params;
      const { payload } = req.body;

      if (!instanceNumber || !workflowId) {
        return res.status(400).json({
          success: false,
          message: "Instance number and workflow ID are required",
        } as InstanceWorkflowResponse);
      }

      // Get workflow config to find webhook URL
      const workflows = await InstanceWorkflowsService.getInstanceWorkflowsByNumber(instanceNumber);
      const workflow = workflows.find((w) => w.workflow_id === workflowId);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: "Workflow not found for this instance",
        } as InstanceWorkflowResponse);
      }

      if (!workflow.webhook_url) {
        return res.status(400).json({
          success: false,
          message: "Workflow does not have a webhook URL configured",
        } as InstanceWorkflowResponse);
      }

      // Trigger the workflow via webhook
      const startTime = Date.now();
      try {
        const response = await fetch(workflow.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instance_number: instanceNumber,
            workflow_id: workflowId,
            ...payload,
          }),
        });

        const durationMs = Date.now() - startTime;
        const responseData = await response.json().catch(() => ({}));

        // Log execution
        if (response.ok) {
          await InstanceWorkflowsService.logExecution(
            instanceNumber,
            workflowId,
            "success",
            responseData,
            undefined,
            durationMs
          );

          console.log(`✅ Workflow triggered successfully:`, {
            instance: instanceNumber,
            workflow: workflowId,
            duration: durationMs + "ms",
          });

          res.json({
            success: true,
            message: "Workflow triggered successfully",
            data: {
              workflow_id: workflowId,
              instance_number: instanceNumber,
              response: responseData,
              duration_ms: durationMs,
            },
          } as InstanceWorkflowResponse);
        } else {
          await InstanceWorkflowsService.logExecution(
            instanceNumber,
            workflowId,
            "failed",
            undefined,
            `HTTP ${response.status}: ${response.statusText}`,
            durationMs
          );

          res.status(500).json({
            success: false,
            message: "Workflow trigger failed",
            error: `HTTP ${response.status}: ${response.statusText}`,
          } as InstanceWorkflowResponse);
        }
      } catch (triggerError: any) {
        const durationMs = Date.now() - startTime;
        await InstanceWorkflowsService.logExecution(
          instanceNumber,
          workflowId,
          "failed",
          undefined,
          triggerError.message,
          durationMs
        );

        console.error(`❌ Workflow trigger error:`, triggerError);
        res.status(500).json({
          success: false,
          message: "Failed to trigger workflow",
          error: triggerError.message,
        } as InstanceWorkflowResponse);
      }
    } catch (error: any) {
      console.error("❌ Error triggering workflow:", error);
      res.status(500).json({
        success: false,
        message: "Failed to trigger workflow",
        error: error.message,
      } as InstanceWorkflowResponse);
    }
  }
);

/**
 * POST /api/instances/:instanceNumber/workflows/:workflowId/toggle
 * Toggle a workflow active/inactive status
 */
router.post(
  "/:instanceNumber/workflows/:workflowId/toggle",
  async (req: AuthRequest, res: Response) => {
    try {
      const { instanceNumber, workflowId } = req.params;

      if (!instanceNumber || !workflowId) {
        return res.status(400).json({
          success: false,
          message: "Instance number and workflow ID are required",
        } as InstanceWorkflowResponse);
      }

      // Get current workflow status
      const workflows = await InstanceWorkflowsService.getInstanceWorkflowsByNumber(instanceNumber);
      const workflow = workflows.find((w) => w.workflow_id === workflowId);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: "Workflow not found for this instance",
        } as InstanceWorkflowResponse);
      }

      // Toggle status
      const updated = await InstanceWorkflowsService.updateWorkflow(
        workflow.instance_id,
        workflowId,
        {
          is_active: !workflow.is_active,
        }
      );

      console.log(
        `✅ Workflow toggled: ${instanceNumber} / ${workflowId} - is_active: ${updated.is_active}`
      );

      res.json({
        success: true,
        message: `Workflow ${updated.is_active ? "activated" : "deactivated"} successfully`,
        data: updated,
      } as InstanceWorkflowResponse);
    } catch (error: any) {
      console.error("❌ Error toggling workflow:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle workflow",
        error: error.message,
      } as InstanceWorkflowResponse);
    }
  }
);

export default router;
