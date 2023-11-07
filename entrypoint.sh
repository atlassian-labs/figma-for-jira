#!/bin/bash

set -e

# Function to URL-encode a string
urlencode() {
  local string="$1"
  local encoded=""
  local length="${#string}"
  for ((i = 0; i < length; i++)); do
    local char="${string:i:1}"
    case "$char" in
    [a-zA-Z0-9.~_-]) encoded+="$char" ;;
    *) encoded+="%"$(printf "%02X" "'$char") ;;
    esac
  done
  echo "$encoded"
}

# This supports both the old environment variables and new ones specific to the Figma setup.
if [ -n "$PG_FIGMA_FOR_JIRA_DB_ROLE" ]; then
  DATABASE_URL="postgresql://${PG_FIGMA_FOR_JIRA_DB_ROLE}:${PG_FIGMA_FOR_JIRA_DB_PASSWORD}@${PG_FIGMA_FOR_JIRA_DB_HOST}:${PG_FIGMA_FOR_JIRA_DB_PORT}/${PG_FIGMA_FOR_JIRA_DB_SCHEMA}"
else
  ENCODED_PASSWORD="$(urlencode "$PG_INTEGRATIONS_JIRA_PASSWORD")"
  DATABASE_URL="postgresql://${PG_INTEGRATIONS_JIRA_USER}:${ENCODED_PASSWORD}@${PG_INTEGRATIONS_HOST}:${PG_INTEGRATIONS_PORT}/${PG_INTEGRATIONS_DATABASE}"
fi

export DATABASE_URL

npx prisma migrate deploy
npx prisma generate
node server.js
