# Atlassian Connect Node Example App

## About

This repository contains an example [Express](https://expressjs.com/en/4x/api.html) server for building an [Atlassian Connect app](https://developer.atlassian.com/cloud/jira/platform/getting-started-with-connect/).
This app is aimed to help you to easily add your integration in Jira.

## Table of Contents

- [Pre-requisites](#pre-requisites)
- [Getting started](#getting-started)
- [Manual Install](#installing-the-app)
- [Database](#database)
- [Testing](#testing)
- [Getting help](#getting-help)
- [License](#license)

## Pre-requisites

- [Node](https://nodejs.org)
- [docker & docker-compose](https://docs.docker.com/engine/install/)
- [ngrok account](https://ngrok.com/)

## Getting started

- **Installing dependencies**

  - Run `npm ci` to install all the dependencies for this app.

- **Configuration**

  - We are using [ngrok](https://ngrok.com/docs/getting-started) for tunnelling. You'll need to create an ngrok
    account to get access to the auth token.
  - [Register a Figma application](https://www.figma.com/developers/api#register-oauth2) via your Figma account and note Client ID and Secret.
  - Create an `.env` file (based on `.env.example`) and fill in _all the missing fields_

- **Running the sandbox**

  - Run `npm run start:sandbox` to bring up a Postgres for the app in Docker

- **Starting the tunnel**

  - Run `npm run start:tunnel` to create an ngrok tunnel

> **Note:** _If you are using a free version of ngrok, please open the tunneled URL first. This needs to be done to bypass the ngrok browser warning. Just visit your ngrok tunnel URL in a browser and click on the Visit button._

- **Generating Prisma client**

  - Run `npm run db:generate` to generate Prisma client and database model. This is done automatically as part of `npm
run start:sandbox`, but should be re-run whenever DB schema changes are made (either explicity or via `npm run db:migrate`).

- **Running the app**

  - Run `npm start` to begin running the app in development mode

## Figma OAuth 2.0

Ensure that you registered a Figma application and filled out env variables in `.env`.

1. Start the app.
2. Replace the placeholders with actual value and visit the following URL to initiate the OAuth flow.

```
https://www.figma.com/oauth?
  client_id=${CLIENT_ID}&
  redirect_uri=${APP_URL}/auth/callback&
  scope=files:read&
  state=${ATTLASSIAN_USER_ID}&
  response_type=code
```

You should see a created record in `FigmaUserCredential` table.

## Installing the App

To install the app, first ensure both the ngrok tunnel and the app are running, and you've filled out the required
values in your `.env` file. Then run `npm run jira:installApp`. The app will be installed to the Jira instance specified by
the `ATLASSIAN_URL` environment variable.

If you want to install the app in multiple Jira instances, please do it manually. Go to your Jira instances and do
the following steps:

- From the header menu, select Apps -> Manage your apps.
- Verify the filter is set to User-installed, and select Settings beneath the User-installed apps table.
- On the Settings pop-up, add Enable development mode and click Apply. Refresh the page.
- On the right side of the header, there should now appear a button Upload app. Click it and enter the app URL
  `/atlassian-connect.json`(`https://${APP_URL}/atlassian-connect.json`)
- Click Upload.
- That's it! You're done. 🎉

## Database

This repository uses [Prisma](https://www.prisma.io/) as an ORM for interacting with a Postgres database.

### Running and inspecting the database locally

1. Fill in `PG_*` variables in `.env` using samples from `.env.example` as a guide
2. Spin up dependencies using `npm run start:sandbox`
3. Using IntelliJ or whatever tool you use for inspecting databases, add a database using fields from from `.env`

### Running migrations

To run a database migration do the following:

1. Make any schema additions in `prisma/schema.prisma`
2. Spin up dependencies using `npm run start:sandbox`. This will also run the `prisma migrate dev` command, applying all
   existing migrations. See [the docs](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production#development-environments)
   for more info
3. To create a new migration after making schema changes, with the sandbox already running, run `npm run db:migrate --name <migration_name>` - this will create your migration in a new folder under `prisma/migrations`. If you omit the `--name` option, you will be prompted to name the migration
4. Running `prisma migrate dev` will trigger generation of artifacts automatically, but you can trigger these manually
   by running `npm run db:generate` to rebuild the `@prisma/client`, which provides type safety and utility functions
   for any newly added tables and fields

## Testing

### Unit tests

Unit tests can be run with `npm run test:unit`.

### Integration tests

Integration tests require a test database. There are two options for running integration tests:

1. Run `npm run test:it:ci`. This will spin up a test database Postgres container using configuration from `.env.test`, run the integration tests, then teardown the database.
2. Alternatively, run `npm run start:sandbox:test`, then `npm run test:it`. This lets you forgo spinning up and tearing down the test database each run. `npm run test:it` will reset the database to its initial state before running integration tests, see the [prisma migrate docs](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production#reset-the-development-database) for more info.

## Getting help

If you have feedback, found a bug or need some help, please create a [new issue in this repo](https://github.com/atlassian/atlassian-connect-example-app-node/issues/new/choose).

## License

The project is available as open source under the terms of the [MIT License](./LICENSE).
