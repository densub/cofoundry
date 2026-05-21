#!/bin/sh
set -eu

: "${BACKEND_URL:?BACKEND_URL is required (e.g. https://cofoundry-api-xxx.run.app)}"
: "${PORT:=8080}"

export BACKEND_URL PORT

envsubst '${BACKEND_URL} ${PORT}' < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
