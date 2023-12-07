#!/bin/bash

set -eu

COMPOSE_FILE=$1

if [[ "$COMPOSE_FILE" == *.integration.yml ]]; then
  ENV_FILE=.env.test
  DB_CONTAINER_NAME=figma-for-jira-db-test
  COMPOSE_PROJECT=test
else
  ENV_FILE=.env
  DB_CONTAINER_NAME=figma-for-jira-db
  COMPOSE_PROJECT=development
fi

docker-compose --project-name "$COMPOSE_PROJECT" --file "$COMPOSE_FILE" --env-file "$ENV_FILE" up --detach

echo 'Waiting for Postgres...'
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER_NAME")" == "healthy" ]; do
  sleep 1
done

echo 'Running DB migrations...'
dotenv -e "$ENV_FILE" -- prisma migrate deploy
