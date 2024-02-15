#!/bin/bash

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

# Export variables from .env file
set -o allexport
source "$SCRIPT_DIR"/../.env set
set +o allexport

docker run --init \
  --rm \
  -e NGROK_AUTHTOKEN=$NGROK_AUTHTOKEN \
  'ngrok/ngrok:latest' http \
    --log stdout \
    --domain=$NGROK_DOMAIN \
    host.docker.internal:"$SERVER_PORT"
