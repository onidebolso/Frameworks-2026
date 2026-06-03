# Guia Docker - Frameworks-2026

Este documento descreve como usar Docker para rodar o projeto Astro (Y).

## Pré-requisitos

- Docker Desktop instalado
- Docker Compose instalado
- Variáveis de ambiente Supabase configuradas

## Configuração das Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env` no diretório `y/`:

```bash
cp y/.env.example y/.env
```

2. Edite o arquivo `y/.env` e preencha com suas credenciais do Supabase:

```
PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

## Desenvolvimento com Docker

### Iniciar o servidor de desenvolvimento

```bash
docker-compose up --build
```

O servidor será acessível em `http://localhost:3042`

### Comandos úteis

```bash
# Iniciar sem rebuild
docker-compose up

# Rodar em background
docker-compose up -d

# Ver logs
docker-compose logs -f frontend

# Parar os serviços
docker-compose down

# Remover volumes também
docker-compose down -v

# Rebuild completo
docker-compose build --no-cache
```

## Produção com Docker

### Build para produção

```bash
docker-compose -f docker-compose.prod.yml up --build
```

O servidor será acessível em `http://localhost:4321`

### Variáveis de Ambiente em Produção

Para produção, configure as variáveis de ambiente via argumentos de build ou arquivo .env:

```bash
docker-compose -f docker-compose.prod.yml up \
  --build \
  -e PUBLIC_SUPABASE_URL=https://seu-project.supabase.co \
  -e PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

## Estrutura do Dockerfile

O Dockerfile usa build multi-stage para otimizar o tamanho da imagem:

1. **Stage builder**: Instala dependências e gera o build estático com Astro
2. **Stage runtime**: Usa apenas o diretório `dist` com um servidor estático (`serve`)

## Troubleshooting

### Porta já em uso

Se a porta 3042 ou 4321 já estiver em uso, modifique a porta no `docker-compose.yml`:

```yaml
ports:
  - "5000:4321"  # Seu local port:container port
```

### Rebuild não está funcionando

Force um rebuild completo:

```bash
docker-compose down -v
docker-compose up --build --no-cache
```

### Problemas com node_modules

Se tiver problemas com dependências, remova o volume e recrie:

```bash
docker volume prune
docker-compose down
docker-compose up --build
```

## Health Check

O serviço inclui um health check que verifica se a aplicação está respondendo:

```bash
docker ps
# Verifique a coluna STATUS
```

Se o health check estiver falhando, verifique os logs:

```bash
docker-compose logs frontend
```
