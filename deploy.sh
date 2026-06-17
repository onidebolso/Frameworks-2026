#!/bin/bash

# Script de Deploy Automático para Frameworks-2026
# Uso: ./deploy.sh marco@95.111.238.203

set -e

if [ -z "$1" ]; then
    echo "❌ Uso: ./deploy.sh usuario@host"
    echo "Exemplo: ./deploy.sh marco@95.111.238.203"
    exit 1
fi

REMOTE="$1"
PROJECT_DIR="~/projects/frameworks-2026"

echo "🚀 Iniciando deploy para $REMOTE..."
echo ""

# 1. Instalar Docker
echo "📦 Instalando Docker na VM..."
ssh "$REMOTE" << 'EOF'
if ! command -v docker &> /dev/null; then
    echo "  → Instalando Docker..."
    sudo apt update -qq && sudo apt upgrade -qq -y
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "  ✅ Docker instalado"
else
    echo "  ✅ Docker já instalado"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "  → Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "  ✅ Docker Compose instalado"
else
    echo "  ✅ Docker Compose já instalado"
fi
EOF

echo ""

# 2. Criar diretório
echo "📁 Criando diretórios..."
ssh "$REMOTE" "mkdir -p ~/projects/frameworks-2026" 2>/dev/null && echo "  ✅ Diretório criado"

# 3. Enviar arquivos
echo ""
echo "📤 Enviando arquivos do projeto..."
scp -r -q --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='.env' \
    Dockerfile docker-compose.prod.yml docker/ healthcheck-*.sh y/ \
  "$REMOTE:~/projects/frameworks-2026/" && echo "  ✅ Arquivos enviados"

# 4. Solicitar credenciais Supabase
echo ""
echo "🔐 Configurando variáveis de ambiente..."
read -p "PUBLIC_SUPABASE_URL: " SUPABASE_URL
read -p "PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_KEY

# 5. Criar .env remotamente
ssh "$REMOTE" << EOF
cd ~/projects/frameworks-2026
cat > y/.env << 'ENVEOF'
PUBLIC_SUPABASE_URL=$SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY
ENVEOF
echo "  ✅ .env configurado"
EOF

# 6. Iniciar Docker
echo ""
echo "🐳 Iniciando Docker..."
ssh "$REMOTE" << 'EOF'
cd ~/projects/frameworks-2026
docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d --build
echo "  ✅ Docker iniciado"
EOF

echo ""
echo "✨ Deploy concluído!"
echo ""
echo "📊 Status:"
ssh "$REMOTE" "cd ~/projects/frameworks-2026 && docker-compose -f docker-compose.prod.yml ps"

echo ""
echo "🌐 Acesse: http://$(echo $REMOTE | cut -d'@' -f2):3041"
echo ""
echo "📝 Ver logs: ssh $REMOTE 'cd ~/projects/frameworks-2026 && docker-compose -f docker-compose.prod.yml logs -f'"
