#!/usr/bin/env node
/**
 * Test Contact Status API Endpoints
 * Creates test data and tests all contact management endpoints
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiUrl = "http://localhost:5049";

// Test token (from .env)
const testToken = "eyJhbGciOiJIUzI1NiIsImtpZCI6ImlrcFZ1bU1sdUdENitDUksiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3N2ZnVjdXN1aG53bXd5b2pteGdyLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJmMmJkZjU5NC1hN2VmLTRjNzktODViOS1jZmM0MDgwN2FhZDIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNjgxNjUwLCJpYXQiOjE3NjE2NzgwNTAsImVtYWlsIjoiY29udGF0by5jYWluYW5kZXNpZ25AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImNvbnRhdG8uY2FpbmFuZGVzaWduQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiY2FpbmFuIG1haWEiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImYyYmRmNTk0LWE3ZWYtNGM3OS04NWI5LWNmYzQwODA3YWFkMiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzYxNjc4MDUwfV0sInNlc3Npb25faWQiOiIxYTU5MWY5ZC01NjUzLTQ3ZDctOTljMi1hYjE3N2UxNTViOTkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.N7CVTQm9YbygAk7qVJ42NEQ84nkov8nTyJ4U_6rlQVE";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Test data
const instanceNumber = "5511999999999";
const testContacts = [
  { contact_jid: "5511988888888@s.whatsapp.net", contact_name: "João Silva" },
  { contact_jid: "5511987777777@s.whatsapp.net", contact_name: "Maria Santos" },
  { contact_jid: "5511986666666@s.whatsapp.net", contact_name: "Pedro Costa" },
  { contact_jid: "5511985555555@s.whatsapp.net", contact_name: "Ana Oliveira" },
  { contact_jid: "5511984444444@s.whatsapp.net", contact_name: "Carlos Mendes" },
];

async function setupTestData() {
  console.log("[INFO] Criando contatos de teste...\n");

  // Insert test contacts
  for (const contact of testContacts) {
    try {
      const { data, error } = await supabase
        .from("instance_contact_status")
        .insert({
          instance_number: instanceNumber,
          contact_jid: contact.contact_jid,
          contact_name: contact.contact_name,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.log(`[WARNING] Erro ao inserir ${contact.contact_name}: ${error.message}`);
      } else {
        console.log(`[SUCCESS] ${contact.contact_name} criado`);
      }
    } catch (err) {
      console.log(`[ERROR] ${contact.contact_name}: ${err.message}`);
    }
  }
}

async function testEndpoints() {
  console.log("\n" + "=".repeat(70));
  console.log("[INFO] Testando endpoints...\n");

  const headers = {
    "Authorization": `Bearer ${testToken}`,
    "Content-Type": "application/json",
  };

  // Test 1: List all contacts
  console.log("[TEST 1] GET /api/instances/:instanceNumber/contacts");
  try {
    const response = await fetch(`${apiUrl}/api/instances/${instanceNumber}/contacts`, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[SUCCESS] Status: ${response.status}`);
      console.log(`[INFO] Contatos encontrados: ${data.count}`);
      if (data.data && data.data.length > 0) {
        console.log(`[INFO] Exemplo: ${data.data[0].contact_name} (${data.data[0].status})`);
      }
    } else {
      console.log(`[ERROR] Status: ${response.status}`);
      const text = await response.text();
      console.log(`[ERROR] Response: ${text.substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
  }

  // Test 2: Get stats
  console.log("\n[TEST 2] GET /api/instances/:instanceNumber/contacts/stats");
  try {
    const response = await fetch(`${apiUrl}/api/instances/${instanceNumber}/contacts/stats`, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[SUCCESS] Status: ${response.status}`);
      console.log(`[INFO] Stats:`, data.data);
    } else {
      console.log(`[ERROR] Status: ${response.status}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
  }

  // Test 3: Pause a contact
  console.log("\n[TEST 3] POST /api/instances/:instanceNumber/contacts/:contactJid/pause");
  try {
    const contactJid = testContacts[0].contact_jid;
    const response = await fetch(
      `${apiUrl}/api/instances/${instanceNumber}/contacts/${encodeURIComponent(contactJid)}/pause`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          duration: 300000, // 5 minutos
          reason: "Teste - pausar contato",
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`[SUCCESS] Status: ${response.status}`);
      console.log(`[INFO] ${testContacts[0].contact_name} pausado até: ${data.data?.paused_until}`);
    } else {
      console.log(`[ERROR] Status: ${response.status}`);
      const text = await response.text();
      console.log(`[ERROR] Response: ${text.substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
  }

  // Test 4: Get paused contacts
  console.log("\n[TEST 4] GET /api/instances/:instanceNumber/contacts/paused");
  try {
    const response = await fetch(`${apiUrl}/api/instances/${instanceNumber}/contacts/paused`, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[SUCCESS] Status: ${response.status}`);
      console.log(`[INFO] Contatos pausados: ${data.count}`);
    } else {
      console.log(`[ERROR] Status: ${response.status}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
  }

  // Test 5: Resume a contact
  console.log("\n[TEST 5] POST /api/instances/:instanceNumber/contacts/:contactJid/resume");
  try {
    const contactJid = testContacts[0].contact_jid;
    const response = await fetch(
      `${apiUrl}/api/instances/${instanceNumber}/contacts/${encodeURIComponent(contactJid)}/resume`,
      {
        method: "POST",
        headers,
      }
    );

    if (response.ok) {
      console.log(`[SUCCESS] Status: ${response.status}`);
      console.log(`[INFO] ${testContacts[0].contact_name} retomado`);
    } else {
      console.log(`[ERROR] Status: ${response.status}`);
      const text = await response.text();
      console.log(`[ERROR] Response: ${text.substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
  }

  // Test 6: Deactivate a contact
  console.log("\n[TEST 6] POST /api/instances/:instanceNumber/contacts/:contactJid/deactivate");
  try {
    const contactJid = testContacts[1].contact_jid;
    const response = await fetch(
      `${apiUrl}/api/instances/${instanceNumber}/contacts/${encodeURIComponent(contactJid)}/deactivate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          reason: "Teste - desativar contato",
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`[SUCCESS] Status: ${response.status}`);
      console.log(`[INFO] ${testContacts[1].contact_name} desativado`);
    } else {
      console.log(`[ERROR] Status: ${response.status}`);
      const text = await response.text();
      console.log(`[ERROR] Response: ${text.substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("[SUCCESS] Testes concluídos!\n");
}

async function main() {
  try {
    await setupTestData();
    await testEndpoints();
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(1);
  }
}

main();
