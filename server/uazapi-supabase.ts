import { supabase } from "./supabase";
import { evolutionPool } from "./evolution-db";

interface EvolutionInstanceRecord {
  id: string;
  number: string;
  name?: string | null;
  connectionStatus?: string | null;
}

interface SupabaseUazapiRecord {
  instance_id: string;
  api_token: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface UazapiTokenRecord {
  instanceId: string;
  instanceNumber: string;
  apiToken: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

async function resolveEvolutionInstanceByNumber(instanceNumber: string): Promise<EvolutionInstanceRecord | null> {
  const normalizedInstanceNumber = (instanceNumber || "").replace(/\D/g, "");

  if (!normalizedInstanceNumber) {
    return null;
  }

  const result = await evolutionPool.query<EvolutionInstanceRecord>(
    `
      SELECT
        id,
        COALESCE(
          NULLIF(number, ''),
          NULLIF(regexp_replace("ownerJid", '@.*$', ''), ''),
          NULLIF(regexp_replace(regexp_replace(id, '@.*$', ''), '\\D', '', 'g'), ''),
          NULLIF(regexp_replace(name, '\\D', '', 'g'), '')
        ) AS number,
        name,
        "connectionStatus"
      FROM "Instance"
      WHERE number = $1
         OR regexp_replace("ownerJid", '@.*$', '') = $1
         OR regexp_replace(regexp_replace(id, '@.*$', ''), '\\D', '', 'g') = $1
         OR regexp_replace(name, '\\D', '', 'g') = $1
      LIMIT 1
    `,
    [normalizedInstanceNumber]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function fetchSupabaseTokenByInstanceId(instanceId: string): Promise<SupabaseUazapiRecord | null> {
  const { data, error } = await supabase
    .from<SupabaseUazapiRecord>("uazapi_instances")
    .select("instance_id, api_token, created_at, updated_at")
    .eq("instance_id", instanceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return data ?? null;
}

export async function getUazapiTokenByInstanceNumber(instanceNumber: string): Promise<UazapiTokenRecord | null> {
  const instance = await resolveEvolutionInstanceByNumber(instanceNumber);
  if (!instance) {
    return null;
  }

  const record = await fetchSupabaseTokenByInstanceId(instance.id);

  return {
    instanceId: instance.id,
    instanceNumber: instance.number,
    apiToken: record?.api_token ?? null,
    createdAt: record?.created_at ?? null,
    updatedAt: record?.updated_at ?? null,
  };
}

export async function upsertUazapiToken(instanceNumber: string, apiToken: string): Promise<UazapiTokenRecord> {
  const instance = await resolveEvolutionInstanceByNumber(instanceNumber);
  if (!instance) {
    throw new Error("Instância não encontrada no Evolution");
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from<SupabaseUazapiRecord>("uazapi_instances")
    .upsert(
      {
        instance_id: instance.id,
        api_token: apiToken,
        updated_at: now,
      },
      { onConflict: "instance_id" }
    )
    .select("instance_id, api_token, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return {
    instanceId: instance.id,
    instanceNumber: instance.number,
    apiToken: data?.api_token ?? apiToken,
    createdAt: data?.created_at ?? now,
    updatedAt: data?.updated_at ?? now,
  };
}

export async function deleteUazapiToken(instanceNumber: string): Promise<boolean> {
  const instance = await resolveEvolutionInstanceByNumber(instanceNumber);
  if (!instance) {
    return false;
  }

  const { error } = await supabase
    .from("uazapi_instances")
    .delete()
    .eq("instance_id", instance.id);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return true;
}
