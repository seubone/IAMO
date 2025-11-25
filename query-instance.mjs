import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findInstance() {
  try {
    console.log("[INFO] Procurando instâncias...\n");

    // Query the Instances table
    const { data, error } = await supabase
      .from("Instances")
      .select("id, name, instance_number, created_at")
      .limit(10);

    if (error) {
      console.log(`[ERROR] ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      console.log("[INFO] Nenhuma instância encontrada");
      return;
    }

    console.log(`[INFO] ${data.length} instâncias encontradas:\n`);

    // Look for Maria Luzia or similar
    data.forEach((instance) => {
      const match = instance.name?.toLowerCase().includes("maria") ? " <-- MARIA LUZIA" : "";
      console.log(`[INFO] ${instance.name}`);
      console.log(`   ID: ${instance.id}`);
      console.log(`   Número: ${instance.instance_number}`);
      console.log(`${match}\n`);
    });
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  }
}

findInstance();
