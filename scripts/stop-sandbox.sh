#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
set -eu

COMPOSE_FILE=$1

if [[ "$COMPOSE_FILE" == *.integration.yml ]]; then
	ENV_FILE=.env.test
	COMPOSE_PROJECT=test
else
	ENV_FILE=.env
	COMPOSE_PROJECT=development
fi

echo 'Stopping app sandbox'
docker-compose --project-name "$COMPOSE_PROJECT" --file "$COMPOSE_FILE" --env-file="$ENV_FILE" down

