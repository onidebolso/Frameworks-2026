# ⚡ Quick Deploy Checklist

## 1️⃣ Conectar na VM
```bash
ssh marco@95.111.238.203
```

## 2️⃣ Instalar Docker (copia e cola tudo de uma vez)
```bash
sudo apt update && sudo apt upgrade -y && \
curl -fsSL https://get.docker.com -o get-docker.sh && \
sudo sh get-docker.sh && \
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
sudo chmod +x /usr/local/bin/docker-compose && \
sudo usermod -aG docker $USER && \
docker --version && docker-compose --version
```

## 3️⃣ Criar Diretório
```bash
mkdir -p ~/projects/frameworks-2026 && cd ~/projects/frameworks-2026
```

## 4️⃣ Clonar Projeto (do seu PC local, não da VM)
```bash
# No seu computador local:
cd /workspaces/Frameworks-2026
scp -r --exclude='node_modules' --exclude='dist' --exclude='.git' \
  Dockerfile docker-compose.prod.yml healthcheck-*.sh y/ \
  marco@95.111.238.203:~/projects/frameworks-2026/
```

## 5️⃣ Configurar Credenciais
Na VM:
```bash
cd ~/projects/frameworks-2026
cat > y/.env << 'EOF'
PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
EOF
```

**⚠️ Substitua as credenciais de exemplo pelas suas reais!**

Se não tiver credenciais ainda, o Docker ainda vai rodar com placeholders (sem funcionalidade Supabase).

## 6️⃣ Rodar Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 7️⃣ Verificar Status
```bash
docker ps
docker-compose -f docker-compose.prod.yml logs
```

## 8️⃣ Acessar
```
http://95.111.238.203:4321
```

---

## 🆘 Se algo der errado:
```bash
# Ver logs detalhados
docker-compose -f docker-compose.prod.yml logs -f frontend

# Limpar e recomeçar
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

✅ Pronto! Seu site está online!
