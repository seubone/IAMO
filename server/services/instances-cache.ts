/**
 * Instances Cache Service
 * Provides caching and optimized loading of Evolution instances
 * Prevents connection pool exhaustion from repeated queries
 */

import { fetchInstances as fetchEvolutionInstances } from "./evolution-instances";
import { InstanceBotStatusService } from "./instance-bot-status";

interface CachedInstance {
  id: string;
  name: string;
  number: string | null;
  ownerJid: string | null;
  profilePicUrl: string | null;
  profileName: string | null;
  connectionStatus: string;
  botStatus?: "active" | "paused" | "inactive";
  pausedUntil?: Date | null;
  inactiveUntil?: Date | null;
}

interface CacheData {
  instances: CachedInstance[];
  timestamp: number;
  source: "evolution_db" | "evolution_api" | "fallback";
}

// Cache configuration
const CACHE_TTL_MS = 30 * 1000; // 30 seconds - prevents excessive queries
const MAX_CACHE_AGE_FALLBACK = 5 * 60 * 1000; // 5 minutes - allow stale cache on error
const INSTANCE_LOAD_TIMEOUT = 10 * 1000; // 10 seconds for instance loading

let cachedData: CacheData | null = null;
let cachePromise: Promise<CachedInstance[]> | null = null;
let lastUpdateAttempt = 0;

/**
 * Enriches instances with bot status information
 */
async function enrichInstancesWithBotStatus(
  instances: CachedInstance[]
): Promise<CachedInstance[]> {
  try {
    // Get bot status for all instances in parallel
    const statusPromises = instances.map(async (instance) => {
      try {
        const status = await InstanceBotStatusService.getStatus(instance.number || "");
        return {
          ...instance,
          botStatus: status?.status as "active" | "paused" | "inactive" | undefined,
          pausedUntil: status?.paused_until,
          inactiveUntil: status?.inactive_until,
        };
      } catch {
        // If bot status lookup fails, return instance without bot status
        return instance;
      }
    });

    return Promise.all(statusPromises);
  } catch (error) {
    console.error("[instances-cache] Error enriching instances with bot status:", error);
    return instances;
  }
}

/**
 * Fetch instances from Evolution API with normalization
 */
async function fetchFromEvolutionApi(): Promise<CachedInstance[]> {
  try {
    console.log("[instances-cache] Fetching from Evolution API...");

    const apiInstances = await Promise.race([
      fetchEvolutionInstances(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Evolution API timeout")), INSTANCE_LOAD_TIMEOUT)
      ),
    ]);

    if (!Array.isArray(apiInstances)) {
      throw new Error("Invalid response from Evolution API");
    }

    const normalized = apiInstances.map(({ instance }) => ({
      id: instance.instanceId,
      name: instance.instanceName,
      number: instance.instanceNumber || null,
      ownerJid: instance.instanceId || instance.instanceNumber || null,
      profilePicUrl: instance.profilePictureUrl || null,
      profileName: instance.profileName || instance.instanceName,
      connectionStatus: normalizeStatus(instance.status),
    }));

    console.log(`[instances-cache] Loaded ${normalized.length} instances from Evolution API`);
    return normalized;
  } catch (error: any) {
    console.error("[instances-cache] Evolution API fetch failed:", error.message);
    throw error;
  }
}

/**
 * Normalize instance status
 */
function normalizeStatus(status?: string): string {
  switch (status) {
    case "connected":
      return "open";
    case "connecting":
      return "connecting";
    default:
      return "close";
  }
}

/**
 * Get cached instances with automatic refresh
 */
export async function getInstances(): Promise<CachedInstance[]> {
  const now = Date.now();

  // Check if cache is still valid
  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    console.log("[instances-cache] Returning cached instances", {
      age: now - cachedData.timestamp,
      count: cachedData.instances.length,
    });
    return cachedData.instances;
  }

  // If already fetching, return the promise (avoid duplicate fetches)
  if (cachePromise) {
    console.log("[instances-cache] Returning in-flight fetch promise");
    return cachePromise;
  }

  // Check if we should wait before retrying (prevent thundering herd)
  const timeSinceLastAttempt = now - lastUpdateAttempt;
  if (timeSinceLastAttempt < 5000 && cachedData) {
    console.log("[instances-cache] Recent update attempt, returning stale cache");
    return cachedData.instances;
  }

  // Fetch new data
  lastUpdateAttempt = now;
  cachePromise = (async () => {
    try {
      // Try to fetch from Evolution API
      const instances = await fetchFromEvolutionApi();

      // Enrich with bot status
      const enriched = await enrichInstancesWithBotStatus(instances);

      // Update cache
      cachedData = {
        instances: enriched,
        timestamp: now,
        source: "evolution_api",
      };

      cachePromise = null;
      console.log("[instances-cache] Cache updated successfully", {
        count: enriched.length,
        source: "evolution_api",
      });

      return enriched;
    } catch (error: any) {
      cachePromise = null;
      console.error("[instances-cache] Fetch failed:", error.message);

      // Return stale cache if available and not too old
      if (cachedData && now - cachedData.timestamp < MAX_CACHE_AGE_FALLBACK) {
        console.log("[instances-cache] Returning stale cache on error", {
          age: now - cachedData.timestamp,
        });
        return cachedData.instances;
      }

      // Fallback: return empty list with error logged
      console.error("[instances-cache] No cache available and fetch failed, returning empty array");
      return [];
    }
  })();

  return cachePromise;
}

/**
 * Invalidate cache (called when instances are modified)
 */
export function invalidateInstancesCache(): void {
  console.log("[instances-cache] Cache invalidated");
  cachedData = null;
  cachePromise = null;
}

/**
 * Get cached instances synchronously (returns null if not available)
 */
export function getCachedInstancesSync(): CachedInstance[] | null {
  return cachedData?.instances || null;
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  const now = Date.now();
  const age = cachedData ? now - cachedData.timestamp : null;
  const isValid = age !== null && age < CACHE_TTL_MS;

  return {
    cached: cachedData !== null,
    age,
    isValid,
    source: cachedData?.source,
    count: cachedData?.instances.length || 0,
  };
}

/**
 * Update bot status for a specific instance in cache
 */
export function updateInstanceBotStatusInCache(
  instanceNumber: string,
  botStatus: "active" | "paused" | "inactive",
  pausedUntil?: Date | null,
  inactiveUntil?: Date | null
): void {
  if (!cachedData) return;

  const instance = cachedData.instances.find((i) => i.number === instanceNumber);
  if (instance) {
    instance.botStatus = botStatus;
    if (pausedUntil !== undefined) instance.pausedUntil = pausedUntil;
    if (inactiveUntil !== undefined) instance.inactiveUntil = inactiveUntil;
  }
}
