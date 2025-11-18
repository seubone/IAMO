const http = require("http");

const targetUrl = process.env.DEV_SERVER_URL || "http://localhost:5049/health";
const maxAttempts = Number(process.env.WAIT_SERVER_ATTEMPTS || 30);
const intervalMs = Number(process.env.WAIT_SERVER_INTERVAL_MS || 1000);

let attempts = 0;

const retry = (message) => {
  if (message) {
    console.warn(message);
  }

  if (attempts >= maxAttempts) {
    console.error(
      `❌ Não foi possível contactar ${targetUrl} após ${attempts} tentativas.`,
    );
    process.exit(1);
  }

  setTimeout(checkServer, intervalMs);
};

const checkServer = () => {
  attempts += 1;

  const req = http.get(targetUrl, (res) => {
    // Considerar qualquer resposta <500 como sucesso para liberar o frontend.
    if (res.statusCode && res.statusCode < 500) {
      console.log(`✅ Backend respondeu em ${targetUrl} (tentativa ${attempts}).`);
      res.resume();
      process.exit(0);
    }

    res.resume();
    retry(
      `⚠️ Backend respondeu com status ${res.statusCode} (tentativa ${attempts}).`,
    );
  });

  req.on("error", (err) => {
    retry(`⚠️ Erro ao contactar backend (tentativa ${attempts}): ${err.message}`);
  });
};

console.log(`🔁 Aguardando backend em ${targetUrl}...`);
checkServer();
