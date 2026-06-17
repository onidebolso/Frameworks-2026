# 🚀 Guia de Deploy em Máquina Virtual

Arquitetura atual do deploy Docker:

- `frontend` (Nginx): porta pública `3041`
- `backend` (Astro SSR + API): rede interna do compose
- `postgres` (DB): rede interna do compose

## Passo 1: Conectar via SSH

```bash
ssh marco@95.111.238.203
```

Digite sua senha quando solicitado.

---

## Passo 2: Instalar Docker e Docker Compose

### Ubuntu/Debian:

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar seu usuário ao grupo docker (opcional, para não usar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

---

## Passo 3: Preparar o Diretório no Servidor

```bash
# Criar diretório para o projeto
mkdir -p ~/projects/frameworks-2026
cd ~/projects/frameworks-2026
```

---

## Passo 4: Enviar o Projeto para a VM

### Opção A: Via SCP (do seu computador local)

```bash
# No seu computador local, dentro do projeto:
cd /workspaces/Frameworks-2026

# Enviar arquivos (exclua node_modules, dist, .git, etc)
scp -r --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='.env' \
  Dockerfile docker-compose.prod.yml docker/ healthcheck-*.sh y/ \
  marco@95.111.238.203:~/projects/frameworks-2026/
```

### Opção B: Via Git (mais prático)

Na VM:
```bash
cd ~/projects/frameworks-2026
git clone https://github.com/onidebolso/Frameworks-2026.git .
```

---

## Passo 5: Configurar Variáveis de Ambiente

Na VM:
```bash
cd ~/projects/frameworks-2026

# Criar arquivo .env
cat > y/.env << EOF
PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
EOF
```

**⚠️ Importante:** Substitua os valores com suas credenciais reais do Supabase.

Se você não tiver credenciais do Supabase ainda, o Docker ainda vai funcionar com valores padrão (placeholder), mas a funcionalidade de Supabase não estará disponível até que você configure as credenciais reais.

---

## Passo 6: Executar Docker em Produção

Na VM:
```bash
cd ~/projects/frameworks-2026

# Build e iniciar em produção
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

---

## Passo 7: Acessar a Aplicação

Abra no navegador:
```
http://95.111.238.203:3041
```

---

## 📋 Comandos Úteis na VM

```bash
# Ver logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Parar o container
docker-compose -f docker-compose.prod.yml down

# Reiniciar
docker-compose -f docker-compose.prod.yml restart

# Rebuild completo
docker-compose -f docker-compose.prod.yml up -d --build

# Ver espaço de disco
docker system df

# Limpar imagens não utilizadas
docker image prune -a
```

---

## 🔍 Troubleshooting

### Porta 3041 já em uso

Mude a porta no `docker-compose.prod.yml`:
```yaml
ports:
  - "8080:80"  # Acesse http://95.111.238.203:8080
```

### Container não inicia

```bash
# Ver erro detalhado
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs postgres

# Verificar se há problema de permissão
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

### Erro de permissão com node_modules

Se tiver erro `EACCES`:
```bash
docker-compose -f docker-compose.prod.yml down -v
docker volume prune
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🔒 Dicas de Segurança

1. **Usar senha SSH forte** ou configurar chaves SSH
2. **Firewall**: Liberar apenas portas necessárias (3041, 22)
3. **Certificado SSL**: Usar nginx como reverse proxy com Let's Encrypt
4. **Variáveis sensíveis**: Nunca commitar `.env` no Git

### Auto-restart com Systemd

Crie `/etc/systemd/system/frameworks.service`:
```ini
[Unit]
Description=Frameworks-2026 Docker
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/home/marco/projects/frameworks-2026
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
Restart=always

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl enable frameworks
sudo systemctl start frameworks
```
