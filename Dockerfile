# Dockerfile multi-stage para produção
# Suporta as duas variantes do repositório: Astro/React em y e Vite/Vue em x.
# Build e runtime são separados para manter a imagem final pequena.

ARG APP_DIR=y
ARG LISTEN_PORT=4321
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY

FROM node:22-alpine AS builder
ARG APP_DIR
ARG PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG PUBLIC_SUPABASE_ANON_KEY=placeholder-key

WORKDIR /app
RUN mkdir -p /app && chown node:node /app

# Define variáveis de build expostas ao processo de bundling do Astro/Vite.
# Usa valores padrão se não fornecidos, permitindo build sem credenciais reais.
ENV PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}
ENV PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY}

# Copia apenas a aplicação selecionada para reduzir o contexto de build.
COPY ${APP_DIR} ./${APP_DIR}
WORKDIR /app/${APP_DIR}

# Instala dependências de build.
RUN npm install

# Gera os arquivos finais no dist.
RUN npm run build

FROM node:22-alpine AS runtime
ARG LISTEN_PORT
ARG APP_DIR

WORKDIR /app
RUN mkdir -p /app && chown node:node /app

# Torna a porta disponível também como ENV em tempo de execução.
ENV LISTEN_PORT=${LISTEN_PORT}

# Instala um servidor estático leve globalmente.
RUN npm install -g serve@14 --no-progress --no-audit --no-fund

# Disponibiliza os scripts de healthcheck no container, caso queira usá-los.
COPY healthcheck-*.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck-*.sh

# Copia apenas o output de produção.
COPY --from=builder /app/${APP_DIR}/dist ./dist

USER node
ENV NODE_ENV=production
EXPOSE ${LISTEN_PORT}

# Use LISTEN_PORT para servir o site.
CMD ["sh", "-lc", "serve -s dist -l ${LISTEN_PORT:-4321}"]
