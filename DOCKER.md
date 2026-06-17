# Guia Docker - Frameworks-2026

Este projeto roda com 3 containers:

- `frontend`: Nginx (porta publica `3041`)
- `backend`: Astro SSR + API (`/api/messages`)
- `postgres`: banco PostgreSQL local da stack

## Pré-requisitos

- Docker
- Docker Compose

## Arquivos principais

- `docker-compose.yml`: stack de desenvolvimento
- `docker-compose.prod.yml`: stack de produção
- `docker/nginx/default.conf`: proxy do frontend para o backend
- `docker/postgres/init/01-messages.sql`: schema inicial local do banco

## Configuração de ambiente

1. Copie o `.env` do app Astro:

```bash
cp y/.env.example y/.env
```

2. Preencha ao menos as chaves públicas do Supabase em `y/.env`:

```env
PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

3. (Opcional) Ajuste as variáveis do PostgreSQL local:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/frameworks
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=frameworks
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

## Desenvolvimento

Subir stack completa:

```bash
docker-compose up --build
```

Acesso:

- App: `http://localhost:3041`
- API: `http://localhost:3041/api/messages`

Comandos úteis:

```bash
docker-compose up -d
docker-compose ps
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose down
docker-compose down -v
```

## Produção

Build + run em background:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Acesso:

- App: `http://localhost:3041`

Logs:

```bash
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

## Troubleshooting

### Porta 3041 ocupada

Altere o mapeamento no compose:

```yaml
services:
  frontend:
    ports:
      - "8080:80"
```

### Rebuild limpo

```bash
docker-compose down -v
docker-compose up -d --build
```

### Verificar saúde dos serviços

```bash
docker-compose ps
```

Todos os serviços devem aparecer como `healthy` ou `Up`.
