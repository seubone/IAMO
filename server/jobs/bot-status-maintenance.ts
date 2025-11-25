/**
 * Bot Status Maintenance Job
 * Periodically checks and auto-resumes expired pauses and inactivations
 * Can be run as a cron job or interval-based background task
 */

import { InstanceBotStatusService } from "../services/instance-bot-status";
import { InstanceContactStatusService } from "../services/instance-contact-status";

let maintenanceRunning = false;
let maintenanceInterval: NodeJS.Timeout | null = null;

/**
 * Perform a single maintenance cycle
 */
async function performMaintenance(): Promise<void> {
  if (maintenanceRunning) {
    console.log("[bot-status-maintenance] Maintenance already running, skipping...");
    return;
  }

  maintenanceRunning = true;
  const startTime = Date.now();

  try {
    console.log("[bot-status-maintenance] Starting maintenance cleanup...");

    // Clean up bot status
    const botResult = await InstanceBotStatusService.performMaintenanceCleanup();
    console.log(
      `[bot-status-maintenance] Bot status cleanup: ${botResult.resumed} resumed, ${botResult.activated} activated`
    );

    // Clean up contact status (if implemented)
    try {
      // Note: Contact status cleanup would go here if needed
      // For now, contacts auto-resume via database triggers
    } catch (contactError) {
      console.error(
        "[bot-status-maintenance] Contact status cleanup failed:",
        contactError
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[bot-status-maintenance] Maintenance completed in ${duration}ms`
    );
  } catch (error: any) {
    console.error("[bot-status-maintenance] Maintenance failed:", error.message);
  } finally {
    maintenanceRunning = false;
  }
}

/**
 * Start automatic maintenance job
 * Runs at specified interval (default: every 60 seconds)
 */
export function startMaintenanceJob(intervalSeconds: number = 60): void {
  if (maintenanceInterval !== null) {
    console.log(
      "[bot-status-maintenance] Maintenance job already running"
    );
    return;
  }

  console.log(
    `[bot-status-maintenance] Starting maintenance job (every ${intervalSeconds}s)`
  );

  // Run immediately on start
  performMaintenance().catch((error) => {
    console.error("[bot-status-maintenance] Initial maintenance failed:", error);
  });

  // Set up recurring maintenance
  maintenanceInterval = setInterval(() => {
    performMaintenance().catch((error) => {
      console.error("[bot-status-maintenance] Scheduled maintenance failed:", error);
    });
  }, intervalSeconds * 1000);
}

/**
 * Stop automatic maintenance job
 */
export function stopMaintenanceJob(): void {
  if (maintenanceInterval !== null) {
    clearInterval(maintenanceInterval);
    maintenanceInterval = null;
    console.log("[bot-status-maintenance] Maintenance job stopped");
  }
}

/**
 * Check if maintenance job is running
 */
export function isMaintenanceRunning(): boolean {
  return maintenanceInterval !== null;
}

/**
 * Manually trigger maintenance (useful for testing or external scheduling)
 */
export async function triggerMaintenance(): Promise<{
  resumed: number;
  activated: number;
}> {
  console.log("[bot-status-maintenance] Manual maintenance triggered");
  const result = await InstanceBotStatusService.performMaintenanceCleanup();
  return {
    resumed: result.resumed,
    activated: result.activated,
  };
}

/**
 * Get maintenance job status
 */
export function getMaintenanceStatus(): {
  running: boolean;
  lastCheck?: Date;
} {
  return {
    running: maintenanceInterval !== null,
  };
}
