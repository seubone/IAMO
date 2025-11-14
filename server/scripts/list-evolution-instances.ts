/**
 * Script: Listar todas as instâncias no banco Evolution
 */

import { evolutionPool } from "../config/evolution-db";

async function listInstances() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        LISTANDO INSTÂNCIAS DO BANCO EVOLUTION                   ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    const result = await evolutionPool.query(`
      SELECT
        id,
        name,
        number,
        "ownerJid",
        "connectionStatus",
        "createdAt",
        "updatedAt"
      FROM "Instance"
      ORDER BY "createdAt" DESC
    `);

    console.log(`\n✅ ${result.rows.length} instância(s) encontrada(s):\n`);

    result.rows.forEach((inst, idx) => {
      console.log(`${idx + 1}. ID: ${inst.id}`);
      console.log(`   Nome: ${inst.name}`);
      console.log(`   Número: ${inst.number}`);
      console.log(`   OwnerJid: ${inst.ownerJid}`);
      console.log(`   Status: ${inst.connectionStatus}`);
      console.log(`   Criada em: ${inst.createdAt}`);
      console.log(``);
    });

  } catch (error: any) {
    console.error(`❌ ERRO:`, error.message);
  }

  process.exit(0);
}

listInstances();
