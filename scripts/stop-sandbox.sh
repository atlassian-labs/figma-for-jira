#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

if [ "$CI" = "true" ]; then
		ENV_FILE="$SCRIPT_DIR"/../.env.test
else
		ENV_FILE="$SCRIPT_DIR"/../.env
fi

echo 'Stopping app sandbox'
docker-compose --env-file="$ENV_FILE" down

