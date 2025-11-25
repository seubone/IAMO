/**
 * Instance Bot Status Routes
 * API endpoints for managing bot pause and inactive status per instance
 */

import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { InstanceBotStatusService } from "../services/instance-bot-status";
import { invalidateInstancesCache, updateInstanceBotStatusInCache } from "../services/instances-cache";
import type { PauseBotRequest, DeactivateBotRequest } from "../../shared/instance-bot-status.types";

const router = Router();

/**
 * GET /api/instances/:instanceNumber/bot-status
 * Get bot status for a specific instance
 */
router.get("/:instanceNumber/bot-status", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        error: "Missing required parameter: instanceNumber",
      });
    }

    const status = await InstanceBotStatusService.getStatus(instanceNumber);

    if (!status) {
      // Create default active status if doesn't exist
      return res.status(404).json({
        error: "Bot status not found",
        data: {
          status: "active",
          instance_number: instanceNumber,
        },
      });
    }

    return res.json({
      data: status,
      status: status.status,
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error getting status:", error);
    return res.status(500).json({
      error: "Failed to get bot status",
      details: error.message,
    });
  }
});

/**
 * POST /api/instances/:instanceNumber/bot-status/pause
 * Pause bot for a specific instance
 */
router.post("/:instanceNumber/bot-status/pause", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;
    const { duration, reason } = req.body as PauseBotRequest;

    if (!instanceNumber) {
      return res.status(400).json({
        error: "Missing required parameter: instanceNumber",
      });
    }

    // Validate duration if provided
    if (duration !== undefined && duration !== null && typeof duration !== "number") {
      return res.status(400).json({
        error: "Duration must be a number (milliseconds) or null",
      });
    }

    const status = await InstanceBotStatusService.pauseBot(
      instanceNumber,
      duration ?? null,
      reason || "Paused by user"
    );

    // Update cache
    updateInstanceBotStatusInCache(
      instanceNumber,
      "paused",
      status.paused_until,
      undefined
    );

    return res.json({
      data: status,
      message: `Bot paused for ${instanceNumber}${
        duration ? ` for ${duration / 1000}s` : " indefinitely"
      }`,
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error pausing bot:", error);
    return res.status(500).json({
      error: "Failed to pause bot",
      details: error.message,
    });
  }
});

/**
 * POST /api/instances/:instanceNumber/bot-status/resume
 * Resume bot for a specific instance
 */
router.post("/:instanceNumber/bot-status/resume", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        error: "Missing required parameter: instanceNumber",
      });
    }

    const status = await InstanceBotStatusService.resumeBot(instanceNumber);

    // Update cache
    updateInstanceBotStatusInCache(instanceNumber, "active", null, undefined);

    return res.json({
      data: status,
      message: `Bot resumed for ${instanceNumber}`,
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error resuming bot:", error);
    return res.status(500).json({
      error: "Failed to resume bot",
      details: error.message,
    });
  }
});

/**
 * POST /api/instances/:instanceNumber/bot-status/deactivate
 * Deactivate bot for a specific instance
 */
router.post("/:instanceNumber/bot-status/deactivate", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;
    const { duration, reason } = req.body as DeactivateBotRequest;

    if (!instanceNumber) {
      return res.status(400).json({
        error: "Missing required parameter: instanceNumber",
      });
    }

    const status = await InstanceBotStatusService.deactivateBot(
      instanceNumber,
      duration ?? null,
      reason || "Deactivated by user"
    );

    // Update cache
    updateInstanceBotStatusInCache(
      instanceNumber,
      "inactive",
      undefined,
      status.inactive_until
    );

    return res.json({
      data: status,
      message: `Bot deactivated for ${instanceNumber}${
        duration ? ` for ${duration / 1000}s` : " indefinitely"
      }`,
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error deactivating bot:", error);
    return res.status(500).json({
      error: "Failed to deactivate bot",
      details: error.message,
    });
  }
});

/**
 * POST /api/instances/:instanceNumber/bot-status/activate
 * Activate bot for a specific instance
 */
router.post("/:instanceNumber/bot-status/activate", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        error: "Missing required parameter: instanceNumber",
      });
    }

    const status = await InstanceBotStatusService.activateBot(instanceNumber);

    // Update cache
    updateInstanceBotStatusInCache(instanceNumber, "active", null, null);

    return res.json({
      data: status,
      message: `Bot activated for ${instanceNumber}`,
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error activating bot:", error);
    return res.status(500).json({
      error: "Failed to activate bot",
      details: error.message,
    });
  }
});

/**
 * GET /api/instances/bot-status/paused
 * Get all paused instances
 */
router.get("/bot-status/paused", authMiddleware, async (req, res) => {
  try {
    const paused = await InstanceBotStatusService.getPausedInstances();

    return res.json({
      data: paused,
      count: paused.length,
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error getting paused instances:", error);
    return res.status(500).json({
      error: "Failed to get paused instances",
      details: error.message,
    });
  }
});

/**
 * GET /api/instances/bot-status/inactive
 * Get all inactive instances
 */
router.get("/bot-status/inactive", authMiddleware, async (req, res) => {
  try {
    const inactive = await InstanceBotStatusService.getInactiveInstances();

    return res.json({
      data: inactive,
      count: inactive.length,
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error getting inactive instances:", error);
    return res.status(500).json({
      error: "Failed to get inactive instances",
      details: error.message,
    });
  }
});

/**
 * GET /api/instances/:instanceNumber/bot-status/effective
 * Get effective bot status (considering time-based expiration)
 */
router.get("/:instanceNumber/bot-status/effective", authMiddleware, async (req, res) => {
  try {
    const { instanceNumber } = req.params;

    if (!instanceNumber) {
      return res.status(400).json({
        error: "Missing required parameter: instanceNumber",
      });
    }

    const effectiveStatus = await InstanceBotStatusService.getEffectiveStatus(
      instanceNumber
    );

    return res.json({
      data: { status: effectiveStatus },
      message: "Effective bot status retrieved",
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error getting effective status:", error);
    return res.status(500).json({
      error: "Failed to get effective status",
      details: error.message,
    });
  }
});

/**
 * GET /api/instances/:instanceNumber/bot-status/remaining-time
 * Get remaining pause/inactive time in milliseconds
 */
router.get(
  "/:instanceNumber/bot-status/remaining-time",
  authMiddleware,
  async (req, res) => {
    try {
      const { instanceNumber } = req.params;

      if (!instanceNumber) {
        return res.status(400).json({
          error: "Missing required parameter: instanceNumber",
        });
      }

      const pauseTime = await InstanceBotStatusService.getPauseRemainingTime(
        instanceNumber
      );
      const inactiveTime =
        await InstanceBotStatusService.getInactiveRemainingTime(instanceNumber);

      return res.json({
        data: {
          pauseRemainingMs: pauseTime,
          inactiveRemainingMs: inactiveTime,
          pauseRemainingSeconds: pauseTime !== null ? pauseTime / 1000 : null,
          inactiveRemainingSeconds:
            inactiveTime !== null ? inactiveTime / 1000 : null,
        },
        message: "Remaining time retrieved",
      });
    } catch (error: any) {
      console.error(
        "[bot-status-routes] Error getting remaining time:",
        error
      );
      return res.status(500).json({
        error: "Failed to get remaining time",
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/instances/bot-status/maintenance
 * Force cleanup of expired pauses and inactivations
 * Call this periodically via cron job
 */
router.post("/bot-status/maintenance", authMiddleware, async (req, res) => {
  try {
    const result = await InstanceBotStatusService.performMaintenanceCleanup();

    return res.json({
      message: "Maintenance cleanup completed",
      data: {
        resumedCount: result.resumed,
        activatedCount: result.activated,
        totalCleaned: result.resumed + result.activated,
      },
    });
  } catch (error: any) {
    console.error("[bot-status-routes] Error during maintenance:", error);
    return res.status(500).json({
      error: "Failed to perform maintenance cleanup",
      details: error.message,
    });
  }
});

export default router;
