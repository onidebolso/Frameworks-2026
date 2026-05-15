#!/bin/sh
# Healthcheck para o serviço PostgreSQL.
PGHOST=${PGHOST:-127.0.0.1}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-postgres}
PGDATABASE=${PGDATABASE:-frameworks}

if command -v pg_isready >/dev/null 2>&1; then
  pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"
  exit $?
fi

echo "pg_isready required for PostgreSQL healthcheck"
exit 1
