#!/usr/bin/env bash

set -e

export DATABASE_URL=postgresql://${PG_FIGMA_FOR_JIRA_DB_ROLE}:${PG_FIGMA_FOR_JIRA_DB_PASSWORD}@${PG_FIGMA_FOR_JIRA_DB_HOST}:5432/${PG_FIGMA_FOR_JIRA_DB_SCHEMA}
npx prisma migrate deploy
node server.js
