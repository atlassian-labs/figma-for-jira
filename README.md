# Figma for Jira

A [Connect app](https://developer.atlassian.com/cloud/jira/platform/getting-started-with-connect/) for integrating Figma
designs into Jira.

- Implements
  the `Design` [Connect module](https://developer.atlassian.com/cloud/jira/platform/about-connect-modules-for-jira/) to
  enable linking/unlinking Figma designs to/from a Jira issue
- Implements an ability to sync Figma design data to Jira for the configured Figma teams.
- Provides backwards compatibility with the previous versions of the app.

The app has been created based
on the [Atlassian Connect Node Example App](https://github.com/atlassian/atlassian-connect-example-app-node).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Installing the app](#installing-the-app)
- [Testing endpoints locally](#testing-endpoints-locally)
- [Database](#database)
- [Testing](#testing)
- [Getting help](#getting-help)
- [License](#license)

## Prerequisites

- Install [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm#install--update-script).
- Install [Docker & Docker Compose](https://docs.docker.com/engine/install/).
- Create an [ngrok](https://ngrok.com/) account.

## Getting started

1. Install and use the traget version of Node.js
   ```shell
   nvm install
   ```
2. Install the dependencies.
   ```shell
   npm ci
   ```
3. Create `.env` file based on `.env.example` and set unset env variables.
4. Start the application sandbox.
   ```shell
   npm run start:sandbox
   ```
5. Start an ngrok tunnel (to make the app accessible from outside).
   ```shell
   npm run start:tunnel
   ```
   > **Note:** If you are using a free version of ngrok, please open the tunneled URL first.
   > This needs to be done to bypass the ngrok browser warning. Just visit your ngrok tunnel URL in a browser and click
   > on the **Visit** button.
6. Start the app.
   ```shell
   npm start
   ```

Open the Connect Descriptor (`${APP_URL}/atlassian-connect.json`) in your browser to verify that the app is up and
running.

## Installing the app

### Install the app via a script

Run `npm run jira:installApp`. The app will be installed to the Jira instance specified by the `ATLASSIAN_URL`
environment variable.

### Install the app manually

Ensure that the app is running locally.

1. Go to http://go.atlassian.com/cloud-dev and sign up (if you don't have your Jira instance). It may take several
   minutes to provision your site.
2. Go to your Jira instance.
3. Enable the installation of apps that are not listed on the Atlassian Marketplace.
   1. Go to **App** > **Manage your apps**.
   2. Click **User-installed apps** > **Settings**.
   3. Check **Enable development mode** and click **Apply**.
4. Reload the page.
5. Install the app.
   1. Go to **App** > **Manage your apps** > **Upload app**.
   2. Paste the link to your Connect descriptor (`${APP_URL}/atlassian-connect.json`) and
      click **Upload**.

## Testing endpoints locally

To test endpoints locally, you can use your preferred tool for making network requests. Our preferred tool
is [Insomnia](https://insomnia.rest/download).

### Authorizing and calling endpoints as a user

Endpoints that call out to Figma APIs require a users 3LO token to be stored in the app. To perform the 3LO flow and
store Figma credentials in the app, follow the steps in [Testing the OAuth flow](#testing-the-oauth-flow).

> The `atlassianUserId` stored in the `FigmaOAuth2UserCredentials` table will need to be passed as the `User-Id` header
> for any of these requests.

### Generating JWTs for local testing

Endpoints that are called by Jira use `authHeaderSymmetricJwtMiddleware` which expects a JWT Authorization header that
will be verified against a `ConnectInstallation`. You will need to generate this JWT token to impersonate Jira when
attempting to test these endpoints.

Because the JWT contains a query string hash `qsh`, you will require a unique JWT token **for each endpoint** you want
to test.

See [Understanding JWT for Connect apps](https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/)
for more details.

**Steps to generate a JWT:**

1. Ensure you have the app and database running, and have installed the app on a Jira instance
2. Enter values for `INSTALLATION_CLIENT_KEY` and `INSTALLATION_CLIENT_SECRET` in your `.env` file. You can find these
   values by inspecting the `ConnectInstallation` table of your database.
3. Run the `npm run jwt:generate <request_method> <url>` script for each endpoint you need to test

**Example:**

```
npm run jwt:generate POST http://localhost:3000/entities/associateEntity
```

You can then use this value as the `Authorization` header for your cURL / Postman / Insomnia requests.

## Database

The app uses [Prisma](https://www.prisma.io/) as an ORM for interacting with a Postgres database.

### Connecting to the database

1. Ensure that you have `.env` with `PG_*` env variables set.
2. Start the application sandbox:
   ```shell
   npm run start:sandbox
   ```
3. Use [IntelliJ Database tool](https://www.jetbrains.com/help/idea/database-tool-window.html#overview) or any other
   tool to connect to the database using the Postgres settings from the `.env` file.

   > **TIP:** If you aren't seeing the tables in IntelliJ, you may have to select the right schemas from the **Schemas**
   > tab in the **Data Sources** window.

### Creating migrations

To run a database migration on your development environment:

1. Ensure that the application sandbox is running.
   ```shell
   npm run start:sandbox
   ```
2. Make schema changes in `prisma/schema.prisma`.
3. Generate a new migration. You will be prompted to name the migration.
   ```shell
   npm run db:migrate:dev
   ```
   This will trigger the regeneration of `@prisma/client` automatically. If you need to regenerate it manually, run
   `npx prisma generate`.

See for more detail [Prisma Docs - Developing with Prisma Migrate](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate).

## Testing

### Unit tests

To run unit tests:

```shell
npm run test:unit
```

### Integration tests

To run integration tests:

```shell
# Spin up a sandbox for integration tests.
npm run start:sandbox:test
# Run integration tests.
npm run test:it
```

## Getting help

If you have feedback, found a bug or need some help, please create
a [new issue in this repo](https://github.com/atlassian/figma-for-jira/issues/new/choose).

## License

The project is available as open source under the terms of the [Apache 2.0 License](./LICENSE).

## References

- [Atlassian Developer - Getting started with Connect](https://developer.atlassian.com/cloud/jira/platform/getting-started-with-connect/)
- [Atlassian Developer - Jira Cloud platform - REST API](https://developer.atlassian.com/cloud/jira/platform/rest/)
- [Figma Developers - REST API](https://www.figma.com/developers/api)
