#!/bin/sh
# Healthcheck para o serviço Vite em x.
PORT=${PORT:-5173}
HOST=${HOST:-127.0.0.1}

if command -v wget >/dev/null 2>&1; then
  wget -qO- "http://$HOST:$PORT" >/dev/null 2>&1
  exit $?
fi

if command -v curl >/dev/null 2>&1; then
  curl --fail --silent "http://$HOST:$PORT" >/dev/null 2>&1
  exit $?
fi

echo "curl or wget required for healthcheck"
exit 1
