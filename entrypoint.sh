#!/bin/bash

set -e

export DATABASE_URL=postgresql://${PG_INTEGRATIONS_JIRA_USER}:${PG_INTEGRATIONS_JIRA_PASSWORD}@${PG_INTEGRATIONS_HOST}:${PG_INTEGRATIONS_PORT}/${PG_INTEGRATIONS_DATABASE}
npx prisma migrate deploy
npx prisma generate
node server.js
