# Atlassian Connect Node Example App

## About

This repository contains an example [Express](https://expressjs.com/en/4x/api.html) server for building an [Atlassian Connect app](https://developer.atlassian.com/cloud/jira/platform/getting-started-with-connect/).
This app is aimed to help you to easily add your integration in Jira.

## Table of Contents

- [Pre-requisites](#pre-requisites)
- [Getting started](#getting-started)
- [OAuth component](#oauth-component)
- [Installing the app](#installing-the-app)
- [Testing endpoints locally](#testing-endpoints-locally)
- [Database](#database)
- [Logging](#logging)
- [Testing](#testing)
- [Getting help](#getting-help)
- [License](#license)

## Pre-requisites

- [Node](https://nodejs.org) v18
- [docker & docker-compose](https://docs.docker.com/engine/install/)
- [ngrok account](https://ngrok.com/)

## Getting started

- **Installing dependencies**

  - Run `npm ci` to install all the dependencies for this app.

- **Configuration**

  - We are using [ngrok](https://ngrok.com/docs/getting-started) for tunnelling. You'll need to create an ngrok
    account to get access to the auth token.
  - Create an `.env` file (based on `.env.example`) and fill in _all the missing fields_
  - Follow the steps for [Registering a Figma OAuth application](#registering-a-figma-oauth-application) to get the client id and secret

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

## OAuth Component

In order to make authorized calls to Figma REST APIs, this application stores Figma user 3LO credentials in the `FigmaOAuth2UserCredentials` table.

### Registering a Figma OAuth application

Follow the steps [here](https://www.figma.com/developers/api#register-oauth2) to register a Figma OAuth app and callback url, and note down the Client ID and Secret.

- Use `APP_URL` for the website URL
- Use `${APP_URL}/auth/callback` for the callback URL

### Testing the OAuth flow

To test the OAuth 3LO flow and store a Figma users' credentials in the app, you first need to register a Figma application and fill out the `FIGMA_OAUTH_CLIENT_ID` and `FIGMA_OAUTH_CLIENT_SECRET` variables in `.env`.

1. Start the app
2. Replace the placeholders with actual value and visit the following URL to initiate the OAuth flow.

```
https://www.figma.com/oauth?
  client_id=${CLIENT_ID}&
  redirect_uri=${APP_URL}/auth/callback&
  scope=files:read,file_dev_resources:read,file_dev_resources:write&
  state=${ATLASSIAN_USER_ID}&
  response_type=code
```

You should see a created record in `FigmaUserCredential` table and hitting `/auth/check3LO?userId=${USER_ID}` should return `{ authorized: true }`

## Installing the App

Before installing, first ensure both the ngrok tunnel and the app are running, and you've filled out the required
values in your `.env` file.

### Installation script

Run `npm run jira:installApp`. The app will be installed to the Jira instance specified by the `ATLASSIAN_URL` environment variable.

### Manual installs

If you want to install the app on multiple Jira instances, you can do this manually by performing the following steps:

1. Visit the **Manage apps** page on your Jira instance (you'll need to be a Jira admin) by visiting this link `https://<your_jira_instance>.atlassian.net/plugins/servlet/upm` or from the header menu, select **Apps** -> **Manage your apps**.
2. Verify the filter is set to User-installed, and select **Settings** beneath the User-installed apps table.
3. **Enable development mode** then refresh the page.
4. You should now see an **Upload app** button. Click it and enter the app URL `https://${APP_URL}/atlassian-connect.json`.
5. Click upload.
6. That's it! You're done. 🎉

## Testing endpoints locally

To test endpoints locally, you can use your preferred tool for making network requests. Our preferred tool is [Insomnia](https://insomnia.rest/download).

### Authorizing and calling endpoints as a user

Endpoints that call out to Figma APIs require a users 3LO token to be stored in the app. To perform the 3LO flow and store Figma credentials in the app, follow the steps in [Testing the OAuth flow](#testing-the-oauth-flow).

> The `atlassianUserId` stored in the `FigmaOAuth2UserCredentials` table will need to be passed as the `User-Id` header for any of these requests.

### Generating JWTs for local testing

Endpoints that are called by Jira use `authHeaderSymmetricJwtMiddleware` which expects a JWT Authorization header that will be verified against a `ConnectInstallation`. You will need to generate this JWT token to impersonate Jira when attempting to test these endpoints.

Because the JWT contains a query string hash `qsh`, you will require a unique JWT token **for each endpoint** you want to test.

See [Understanding JWT for Connect apps](https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/) for more details.

**Steps to generate a JWT:**

1. Ensure you have the app and database running, and have installed the app on a Jira instance
2. Enter values for `INSTALLATION_CLIENT_KEY` and `INSTALLATION_CLIENT_SECRET` in your `.env` file. You can find these values by inspecting the `ConnectInstallation` table of your database.
3. Run the `npm run jwt:generate <request_method> <url>` script for each endpoint you need to test

**Example:**

```
npm run jwt:generate POST http://localhost:3000/entities/associateEntity
```

You can then use this value as the `Authorization` header for your cURL / Postman / Insomnia requests.

## Database

This repository uses [Prisma](https://www.prisma.io/) as an ORM for interacting with a Postgres database.

### Running and inspecting the database locally

1. Ensure `PG_*` variables in `.env` are filled in. Values from `.env.example` should work
2. Spin up the database using `npm run start:sandbox`
3. Using IntelliJ or whatever tool you use for inspecting databases, add a database using fields from from `.env`

> If you aren't seeing the tables in IntelliJ, you may have to select the right schemas from the 'Schemas' tab in the Data Sources window.

### Running migrations

To run a database migration do the following:

1. Make any schema additions in `prisma/schema.prisma`
2. Spin up dependencies using `npm run start:sandbox`. This will also run the `prisma migrate dev` command, applying all
   existing migrations. See the [Prisma docs](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production#development-environments)
   for more info
3. To create a new migration after making schema changes, with the sandbox already running, run `npm run db:migrate --name <migration_name>` - this will create your migration in a new folder under `prisma/migrations`. If you omit the `--name` option, you will be prompted to name the migration
4. Running `prisma migrate dev` will trigger generation of artifacts automatically, but you can trigger these manually
   by running `npm run db:generate` to rebuild the `@prisma/client`, which provides type safety and utility functions
   for any newly added tables and fields

## Logging

The app uses [pino](https://github.com/pinojs/pino) and [pino-http](https://github.com/pinojs/pino-http) for logging. The logger is configured in `/src/infrastructure/logger.ts` and `pino-http` middleware logging is set up in `src/web/middleware/http-logger-middleware.ts`

## Testing

### Unit tests

Unit tests can be run with `npm run test:unit`.

### Integration tests

Integration tests require a test database. There are two options for running integration tests:

1. Run `npm run test:it:ci`. This will spin up a test database Postgres container using configuration from `.env.test`, run the integration tests, then teardown the database.
2. Alternatively, run `npm run start:sandbox:test`, then `npm run test:it`. This lets you forgo spinning up and tearing down the test database each run. `npm run test:it` will reset the database to its initial state before running integration tests, see the [prisma migrate docs](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production#reset-the-development-database) for more info.

## Getting help

If you have feedback, found a bug or need some help, please create a [new issue in this repo](https://github.com/atlassian/figma-for-jira/issues/new/choose).

## License

The project is available as open source under the terms of the [MIT License](./LICENSE).
