#!/bin/bash

set -e

# This supports both the old environment variables and new ones specific to the Figma setup.
if [ -n "$PG_FIGMA_FOR_JIRA_DB_ROLE" ]; then
  DATABASE_URL=postgresql://${PG_FIGMA_FOR_JIRA_DB_ROLE}:${PG_FIGMA_FOR_JIRA_DB_PASSWORD}@${PG_FIGMA_FOR_JIRA_DB_HOST}:${PG_FIGMA_FOR_JIRA_DB_PORT}/${PG_FIGMA_FOR_JIRA_DB_SCHEMA}
else
  DATABASE_URL=postgresql://${PG_INTEGRATIONS_JIRA_USER}:${PG_INTEGRATIONS_JIRA_PASSWORD}@${PG_INTEGRATIONS_HOST}:${PG_INTEGRATIONS_PORT}/${PG_INTEGRATIONS_DATABASE}
fi

export DATABASE_URL

npx prisma migrate deploy
npx prisma generate
node server.js
