# 🚀 VPS Deployment Guide - Monitor IA

Guia completo para fazer deploy do projeto Monitor IA em uma VPS usando Docker.

## 📋 Pré-requisitos

- VPS com acesso SSH
- Docker instalado na VPS
- Docker Compose instalado na VPS
- Todas as credenciais configuradas (.env ou variáveis de ambiente)

## 🔧 Instalação de Docker na VPS

Se ainda não tiver Docker instalado, execute na VPS:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (para não precisar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## 📁 Preparação Local

### 1. Build e Teste Localmente (Recomendado)

Antes de fazer deploy, teste localmente:

```bash
# Build a imagem
docker build -t monitor-ia:latest .

# ou use docker-compose
docker-compose build
```

### 2. Preparar Credenciais

```bash
# Copie o template de produção
cp .env.production .env.docker

# Edite com suas credenciais reais
nano .env.docker

# Variáveis críticas:
# - DATABASE_URL (seu banco PostgreSQL)
# - JWT_SECRET (gere um novo com: openssl rand -base64 32)
# - SUPABASE_* (suas credenciais Supabase)
# - EVOLUTION_API_* (seu Evolution API)
```

## 🚀 Deploy na VPS

### 1. Conectar via SSH

```bash
# Windows PowerShell ou Linux/Mac
ssh root@31.97.255.54 -p 22
# Senha: o8#IBo1OAS&bp07&hgJP

# Ou use ssh-key se tiver configurado
ssh -i ~/.ssh/id_rsa root@31.97.255.54
```

### 2. Clonar Repositório na VPS

```bash
# Criar diretório para aplicação
mkdir -p /var/www/monitor-ia
cd /var/www/monitor-ia

# Clone o repositório (ou copie via SCP)
git clone https://github.com/seu-usuario/monitor-ia.git .

# Ou se usar SCP (do seu computador):
scp -r .env.docker root@31.97.255.54:/var/www/monitor-ia/
scp -r Dockerfile root@31.97.255.54:/var/www/monitor-ia/
scp -r docker-compose.yml root@31.97.255.54:/var/www/monitor-ia/
scp -r package*.json root@31.97.255.54:/var/www/monitor-ia/
```

### 3. Configurar .env na VPS

Na VPS:

```bash
cd /var/www/monitor-ia

# Copiar template
cp .env.production .env

# Editar com credenciais
nano .env

# Salvar (Ctrl+O, Enter, Ctrl+X)
```

### 4. Build e Start com Docker Compose

Na VPS:

```bash
cd /var/www/monitor-ia

# Build a imagem (pode levar 5-10 minutos na primeira vez)
docker-compose build

# Inicie os containers
docker-compose up -d

# Verifique o status
docker-compose ps

# Ver logs
docker-compose logs -f app
```

### 5. Testar Aplicação

```bash
# Teste o health check
curl http://localhost:5051/health

# Veja se retorna:
# {"status":"ok"} ou similar

# Veja logs completos
docker-compose logs app | tail -50
```

## 🔍 Comandos Úteis do Docker

### Ver Containers Rodando

```bash
# Com docker-compose
docker-compose ps

# Com docker
docker ps -a

# Com filtro
docker ps -a | grep monitor
```

### Ver Logs

```bash
# Logs da aplicação
docker-compose logs -f app

# Últimas 50 linhas
docker-compose logs -f app --tail 50

# Sem follow (sair com q)
docker-compose logs app | less
```

### Restart Containers

```bash
# Reiniciar tudo
docker-compose restart

# Reiniciar apenas app
docker-compose restart app

# Parar tudo
docker-compose down

# Parar e remover volumes
docker-compose down -v
```

### Executar Comandos dentro do Container

```bash
# Executar comando
docker-compose exec app npm run db:push

# Acessar shell
docker-compose exec app /bin/sh
```

### Limpar Espaço

```bash
# Remover imagens não usadas
docker image prune -a

# Remover containers parados
docker container prune

# Ver uso de disco
docker system df
```

## 🌐 Configurar Domínio (Nginx/Proxy)

Se quiser usar um domínio ao invés de IP:port:

### Opção 1: Configurar Firewall/Port Forwarding

```bash
# Na VPS, abrir porta 5000 para tráfego web
sudo ufw allow 5000/tcp

# Acessar em: http://seu-dominio.com:5000
```

### Opção 2: Usar Nginx como Reverse Proxy

```bash
# Na VPS
sudo apt install nginx

# Criar arquivo de config
sudo nano /etc/nginx/sites-available/monitor-ia

# Conteúdo:
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:5051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar config
sudo ln -s /etc/nginx/sites-available/monitor-ia /etc/nginx/sites-enabled/

# Testar
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx

# Acessar em: http://seu-dominio.com
```

### Opção 3: SSL/HTTPS com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seu-dominio.com

# Auto-renovação está ativada por padrão
```

## 🔒 Segurança

### Checklist de Segurança

- [ ] `.env` está em `.gitignore` e não commitado
- [ ] `JWT_SECRET` é uma string aleatória FORTE (32+ caracteres)
- [ ] `ALLOWED_ORIGINS` limitado ao seu domínio em produção
- [ ] Credenciais do banco em variáveis de ambiente
- [ ] HTTPS/SSL ativado (Let's Encrypt)
- [ ] Firewall configurado (apenas portas necessárias abertas)
- [ ] Backups automáticos do banco configurados
- [ ] Monitoramento de logs ativado

### Comandos de Segurança

```bash
# Abrir firewall para SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verificar firewall
sudo ufw status

# Atualizar sistema periodicamente
sudo apt update && sudo apt upgrade -y
```

## 💾 Backups

### Backup do Banco de Dados

```bash
# Conectar ao banco e fazer backup
pg_dump -h seu-host -U seu-usuario seu-db > backup.sql

# Ou se usar docker
docker-compose exec postgres pg_dump -U postgres seu-db > backup.sql

# Restaurar
psql -h seu-host -U seu-usuario seu-db < backup.sql
```

### Backup do .env

```bash
# Manter cópia segura
scp root@31.97.255.54:/var/www/monitor-ia/.env ~/.backup/monitor-ia.env

# Proteger arquivo
chmod 600 ~/.backup/monitor-ia.env
```

## 🐛 Troubleshooting

### Container não sobe

```bash
# Verifique logs
docker-compose logs app

# Problemas comuns:
# - Porta 5051 já em uso: mudar em docker-compose.yml
# - Falta de memória: aumentar em deploy.resources
# - Variáveis de ambiente não definidas: verificar .env
```

### Conexão com banco falha

```bash
# Testar conexão
docker-compose exec app psql postgresql://$DATABASE_URL

# Verificar se banco está acessível
telnet seu-host 5432

# Verificar credenciais no .env
cat .env | grep DATABASE_URL
```

### Aplicação lenta/travando

```bash
# Verificar recursos
docker stats

# Aumentar limites em docker-compose.yml:
# deploy.resources.limits.memory
# deploy.resources.limits.cpus

# Reiniciar container
docker-compose restart app
```

### Porta já em uso

```bash
# Encontrar processo usando porta 5051
lsof -i :5051

# Matar processo (se for outro container)
docker-compose down
docker stop $(docker ps -q)

# Mudar porta em docker-compose.yml se necessário
```

## 📊 Monitoramento

### Verificar Saúde da Aplicação

```bash
# Health check manual
curl http://localhost:5051/health

# Com verbose
curl -v http://localhost:5051/health

# Com interval
while true; do curl http://localhost:5051/health && echo "" && sleep 10; done
```

### Monitorar Logs em Tempo Real

```bash
# Acompanhar todos os logs
docker-compose logs -f

# Apenas errors
docker-compose logs app 2>&1 | grep -i error

# Com timestamp
docker-compose logs -f --timestamps app
```

## 🔄 Updates

Quando tiver novo código para deploy:

```bash
cd /var/www/monitor-ia

# Pull código novo
git pull origin main

# Rebuild imagem
docker-compose build

# Restart containers
docker-compose up -d

# Verifique logs
docker-compose logs -f app
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs app`
2. Teste a saúde: `curl http://localhost:5051/health`
3. Verifique conectividade: `telnet seu-host 5432`
4. Confirme credenciais: `cat .env | grep -E "DATABASE|SUPABASE"`

## 🎉 Sucesso!

Sua aplicação deve estar rodando em:
- **API**: `http://seu-dominio.com:5051`
- **Frontend**: `http://seu-dominio.com` (com nginx)

Parabéns! 🚀
