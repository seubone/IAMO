# Simonia Docker Image

Imagem Docker otimizada para o Simonia - Plataforma de Monitoramento de IA com WhatsApp.

## Tags Disponíveis

- `cainanmaia/simonia:latest` - Última versão
- `cainanmaia/simonia:v1.0.0` - Versão específica

## Quick Start

```bash
docker run -d \
  --name simonia \
  -p 5051:5051 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/simonia \
  -e EVOLUTION_DB_HOST=31.97.255.54 \
  -e EVOLUTION_DB_PORT=5432 \
  -e EVOLUTION_DB_NAME=evolution \
  -e EVOLUTION_DB_USER=postgres \
  -e EVOLUTION_DB_PASSWORD=senha \
  -e SUPABASE_URL=https://seu-projeto.supabase.co \
  -e SUPABASE_ANON_KEY=sua-chave \
  cainanmaia/simonia:latest
```

## Variáveis de Ambiente Obrigatórias

- **DATABASE_URL**: Connection string do PostgreSQL principal
  - Exemplo: `postgresql://postgres:senha@31.97.255.54:5432/simonia`

- **EVOLUTION_DB_HOST**: Host do banco Evolution
  - Padrão: `31.97.255.54`

- **EVOLUTION_DB_PORT**: Porta do banco Evolution
  - Padrão: `5432`

- **EVOLUTION_DB_NAME**: Nome do banco Evolution
  - Padrão: `evolution`

- **EVOLUTION_DB_USER**: Usuário do banco Evolution
  - Padrão: `postgres`

- **EVOLUTION_DB_PASSWORD**: Senha do banco Evolution

- **SUPABASE_URL**: URL do projeto Supabase para autenticação

- **SUPABASE_ANON_KEY**: Chave anônima Supabase

- **VITE_SUPABASE_URL**: URL Supabase (frontend)

- **VITE_SUPABASE_ANON_KEY**: Chave Supabase (frontend)

## Variáveis Opcionais

- **PORT**: Porta da aplicação (padrão: `5051`)
- **JWT_SECRET**: Chave secreta JWT
- **ALLOWED_ORIGINS**: Origens CORS permitidas (comma-separated)
- **EVOLUTION_API_URL**: URL da Evolution API
- **EVOLUTION_API_KEY**: Chave da Evolution API
- **UAZAPI_BASE_URL**: URL base da UazAPI

## Health Check

A imagem inclui health check que valida o endpoint `/health`:

```bash
curl http://localhost:5051/health
```

## Portas

- **5051**: API Backend
- **5000**: Frontend (se exposto pelo Docker)

## Volumes (Opcional)

Se precisar de dados persistentes, você pode montar:

```bash
docker run -d \
  -v /caminho/local:/app/data \
  cainanmaia/simonia:latest
```

## Logs

```bash
docker logs -f simonia
```

## Limpar/Remover

```bash
docker stop simonia
docker rm simonia
```

## Build Local

```bash
git clone <seu-repo>
cd Monitoramento-de-IA
docker build -t cainanmaia/simonia:dev .
docker run -d -p 5051:5051 cainanmaia/simonia:dev
```

## Versionamento

As imagens são automaticamente publicadas quando você cria um git tag:

```bash
git tag v1.0.1
git push origin v1.0.1
# GitHub Actions builda e publica cainanmaia/simonia:v1.0.1 + latest
```

## Suporte

Para issues e sugestões, abra uma issue no GitHub.

---

**Imagem otimizada com multi-stage build, Alpine Linux, healthcheck e security best practices.**
