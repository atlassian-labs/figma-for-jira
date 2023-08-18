#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Export variables from .env file
set -o allexport
source "$SCRIPT_DIR"/../.env set
set +o allexport

docker run --init --rm --publish='4040:4040' 'wernight/ngrok' ngrok http -log stdout --authtoken "$NGROK_AUTHTOKEN" host.docker.internal:"$SERVER_PORT"
