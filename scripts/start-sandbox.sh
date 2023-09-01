#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
DB_CONTAINER_NAME=figma-for-jira-db

if [ "$CI" = "true" ]; then
		ENV_FILE="$SCRIPT_DIR"/../.env.test
else
		ENV_FILE="$SCRIPT_DIR"/../.env
fi

echo 'Starting app sandbox'
docker-compose --env-file="$ENV_FILE" up --detach

echo 'Waiting for Postgres...'
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER_NAME")" == "healthy" ]; do
    sleep 1;
done;

if [ "$CI" != "true" ]; then
    echo 'Initialising test DB and user'
    docker exec --env-file "$SCRIPT_DIR"/../.env.test -i "$DB_CONTAINER_NAME" bash < "$SCRIPT_DIR"/init-db.sh

		echo 'Running database migrations'
		prisma migrate dev
fi
