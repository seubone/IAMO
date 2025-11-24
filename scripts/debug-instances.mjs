const { Pool } = require('pg');

const pool = new Pool({
  host: '31.97.255.54',
  port: 5432,
  database: 'evolution',
  user: 'postgres',
  password: '15190b6802844e6781b2'
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT id, name, number, "ownerJid", "connectionStatus", token
      FROM "Instance"
      WHERE name IN ('mariaianova', 'renangrowth')
    `);

    console.log('=== Instâncias no banco local ===');
    result.rows.forEach(row => {
      console.log(`\nNome: ${row.name}`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Número: ${row.number}`);
      console.log(`  Owner JID: ${row.ownerJid}`);
      console.log(`  Status: ${row.connectionStatus}`);
      console.log(`  Token: ${row.token ? '✓ presente' : '✗ ausente'}`);
    });

    await pool.end();
  } catch (e) {
    console.error('Erro:', e.message);
  }
})();
