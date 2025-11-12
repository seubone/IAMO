import fs from 'fs';
import path from 'path';
import { evolutionPool } from './evolution-db';

/**
 * Script para executar migrations do banco de dados
 */
async function runMigration() {
  const client = await evolutionPool.connect();

  try {
    console.log('🔄 Iniciando migration...');

    // Ler o arquivo SQL de migration
    const migrationPath = path.join(__dirname, 'migrations', 'add-send-api-column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executando SQL:');
    console.log(sql);

    // Executar a migration
    await client.query(sql);

    console.log('✅ Migration executada com sucesso!');

    // Verificar se a coluna foi adicionada
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'uazapi_instances'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Estrutura atual da tabela uazapi_instances:');
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'nenhum'})`);
    });
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await evolutionPool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✅ Migration concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na migration:', error);
      process.exit(1);
    });
}

export { runMigration };
