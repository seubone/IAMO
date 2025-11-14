/**
 * Script de Teste: Conectar ao Banco Evolution Remoto
 * Verifica se o banco Evolution existe e está acessível
 */

import { Pool } from "pg";

async function testEvolutionDB() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║      TESTE DE CONEXÃO - BANCO EVOLUTION REMOTO                 ║
╚════════════════════════════════════════════════════════════════╝
  `);

  const config = {
    host: process.env.EVOLUTION_DB_HOST || "31.97.255.54",
    port: parseInt(process.env.EVOLUTION_DB_PORT || "5432"),
    user: process.env.EVOLUTION_DB_USER || "postgres",
    password: process.env.EVOLUTION_DB_PASSWORD,
    database: process.env.EVOLUTION_DB_NAME || "evolution",
  };

  console.log(`📡 Tentando conectar ao servidor PostgreSQL...`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   Password: ${config.password ? "***" : "VAZIO"}`);

  // TEST 1: Conectar ao banco "evolution" específico
  console.log(`\n🔌 [TEST 1] Tentando conectar ao banco "evolution"...`);
  const evolutionPool = new Pool(config);

  try {
    const result = await evolutionPool.query("SELECT NOW() as current_time");
    console.log(`✅ CONECTADO COM SUCESSO ao banco "evolution"`);
    console.log(`   Hora do servidor: ${result.rows[0].current_time}`);

    // TEST 2: Contar tabelas
    console.log(`\n📊 [TEST 2] Listando tabelas do banco...`);
    const tablesResult = await evolutionPool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`✅ ${tables.length} tabela(s) encontrada(s):`);
    tables.forEach(name => {
      console.log(`   - ${name}`);
    });

    // TEST 3: Contar instâncias
    console.log(`\n🤖 [TEST 3] Contando instâncias...`);
    const instancesResult = await evolutionPool.query(`
      SELECT COUNT(*) as total FROM "Instance"
    `);
    console.log(`✅ ${instancesResult.rows[0].total} instância(s) no banco`);

    // TEST 4: Contar chats
    console.log(`\n💬 [TEST 4] Contando chats...`);
    const chatsResult = await evolutionPool.query(`
      SELECT COUNT(*) as total FROM "Chat"
    `);
    console.log(`✅ ${chatsResult.rows[0].total} chat(s) no banco`);

    // TEST 5: Contar mensagens
    console.log(`\n📨 [TEST 5] Contando mensagens...`);
    const messagesResult = await evolutionPool.query(`
      SELECT COUNT(*) as total FROM "Message"
    `);
    console.log(`✅ ${messagesResult.rows[0].total} mensagem(s) no banco`);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    RESULTADO: SUCESSO!                          ║
╚════════════════════════════════════════════════════════════════╝

✅ Banco Evolution está acessível
✅ Todas as tabelas existem
✅ Sistema pode carregar instâncias, chats e mensagens

PRÓXIMOS PASSOS:
1. Reinicie o servidor Node.js
2. Acesse a página de Chat
3. Selecione uma instância
4. As mensagens devem carregar agora!
    `);

    await evolutionPool.end();
    process.exit(0);

  } catch (error: any) {
    console.error(`\n❌ ERRO ao conectar:`, {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });

    if (error.code === "ECONNREFUSED") {
      console.log(`\n💡 PROBLEMA: Servidor PostgreSQL não está respondendo`);
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   Possíveis causas:`);
      console.log(`   1. Servidor está offline`);
      console.log(`   2. Host/porta incorretos`);
      console.log(`   3. Firewall bloqueando conexão`);
    } else if (error.code === "3D000") {
      console.log(`\n💡 PROBLEMA: Banco "evolution" não existe no servidor`);
      console.log(`\n🔧 SOLUÇÃO: Conectar ao banco "postgres" e criar "evolution"`);
      console.log(`\n   PGPASSWORD=${config.password} psql -h ${config.host} -U ${config.user} -d postgres -c "CREATE DATABASE ${config.database};"`);

      // TEST 2: Tentar conectar ao banco "postgres" para listar bancos
      console.log(`\n🔍 [TEST 2] Tentando conectar ao banco "postgres" para listar bancos...`);
      const postgresConfig = { ...config, database: "postgres" };
      const postgresPool = new Pool(postgresConfig);

      try {
        const listResult = await postgresPool.query(`
          SELECT datname FROM pg_database
          WHERE datname NOT IN ('postgres', 'template0', 'template1')
          ORDER BY datname
        `);

        const bancos = listResult.rows.map(r => r.datname);
        console.log(`✅ Bancos disponíveis no servidor:`);
        bancos.forEach(db => {
          console.log(`   - ${db}`);
        });

        if (!bancos.includes("evolution")) {
          console.log(`\n⚠️ Banco "evolution" NÃO EXISTE`);
          console.log(`\n🔧 Para criar o banco, execute:`);
          console.log(`   PGPASSWORD=${config.password} psql -h ${config.host} -U ${config.user} -d postgres -c "CREATE DATABASE evolution;"`);
        }

        await postgresPool.end();
      } catch (postgresError: any) {
        console.error(`❌ Erro ao conectar ao banco "postgres":`, postgresError.message);
      }
    } else if (error.code === "28P01") {
      console.log(`\n💡 PROBLEMA: Credenciais incorretas (autenticação falhou)`);
      console.log(`   User: ${config.user}`);
      console.log(`   Verifique a senha no .env`);
    } else if (error.code === "ENOTFOUND") {
      console.log(`\n💡 PROBLEMA: Host não encontrado`);
      console.log(`   Host: ${config.host}`);
      console.log(`   Verifique se o host está correto no .env`);
    }

    process.exit(1);
  }
}

testEvolutionDB();
