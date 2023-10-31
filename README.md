# Figma for Jira

A [Connect app](https://developer.atlassian.com/cloud/jira/platform/getting-started-with-connect/) for integrating Figma
designs into Jira.

- Implements the `Design` [Connect module](https://developer.atlassian.com/cloud/jira/platform/about-connect-modules-for-jira/) to
  enable linking/unlinking Figma designs to/from a Jira issue.
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

## Debugging

### With IntelliJ

1. Ensure that the app is running locally (see [Getting started](#getting-started)).
2. Choose **Attach to Node.js** configuration and click **Debug**.

## Installing the app

Ensure that the app is running locally (see [Getting started](#getting-started)).

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

### `/lifecycleEvents/` endpoints

These endpoints handle Connect lifecycle events and are called by Jira backend.

1. [Install](#installing-the-app) your locally running app on your Jira instance to receive lifecycle event requests.

### `/admin/` endpoints

These endpoints implement the functionality required by admin UI.

1. [Install](#installing-the-app) your locally running app on your Jira instance.
2. Go to **Figma for Jira** > **Configure** to open admin UI.
3. Use admin UI to trigger requests to the endpoints.

### `/entities` and `/auth` endpoints

These endpoints represent the implementation of the `Design` [Connect module](https://developer.atlassian.com/cloud/jira/platform/about-connect-modules-for-jira/)
module and called by Jira backend.

#### Testing via Jira

1. [Install](#installing-the-app) your locally running app on your Jira instance (see above) to receive lifecycle event requests.
2. Open a Jira issue.
3. Use the **Designs** panel to trigger requests to the endpoints.

#### Testing directly

If needed, you could these APIs directly by mimicking Jira backend.

1. [Install](#installing-the-app) your locally running app on your Jira instance.
2. Find information about your Atlassian site and user.
   - To find your `CLIENT_KEY` and `SHARED_SECRET`, see the `jira_connect_installation` database table..
   - To find your `ATLASSIAN_USER_ID`, open https://id.atlassian.com/gateway/api/me and see `account_id`.
   - To find your `ATLASSIAN_CLOUD_ID`, open `https://${MY_SITE_NAME}.atlassian.net/_edge/tenant_info` and see `cloudId`.
3. Generate a JWT token for a target endpoint, e.g.:

   ```shell
   npm run jira:jwt:symmetric:server:generate -- \
    --clientKey "${CLIENT_KEY}" \
    --sharedSecret "${SHARED_SECRET}" \
    --method "GET" \
    --endpoint "/auth/checkAuth?userId=${ATLASSIAN_USER_ID}"
   ```

   ```shell
   npm run jira:jwt:symmetric:server:generate -- \
    --clientKey "${CLIENT_KEY}" \
    --sharedSecret "${SHARED_SECRET}" \
    --method "POST" \
    --endpoint "/entities/associateEntity"
   ```

4. Use `cURL` or any other tool to call endpoints. Replace placeholders with real values in the commands below, e.g.:

   ```shell
   curl --request GET \
     --url '${APP_URL}/auth/checkAuth?userId=${ATLASSIAN_USER_ID}' \
     --header 'Authorization: JWT ${TOKEN}'
   ```

   ```shell
   curl --request POST \
     --url '${APP_URL}/entities/associateEntity' \
     --header 'Authorization: JWT ${TOKEN}' \
     --header 'Content-Type: application/json' \
     --header 'user-id: ${ATLASSIAN_USER_ID}' \
     --data '{
       "entity": {
           "url": "https://www.figma.com/file/${FILE_KEY}"
       },
       "associateWith": {
           "ati": "ati:cloud:jira:issue",
           "ari": "ari:cloud:jira:${ATLASSIAN_CLOUD_ID}:issue/10002",
           "cloudId": "${ATLASSIAN_CLOUD_ID}",
           "id": "${JIRA_ISSUE_ID}"
       }
   }'
   ```

   ```shell
    curl --request POST \
      --url '${APP_URL}/entities/disassociateEntity' \
      --header 'Authorization: JWT ${TOKEN}' \
      --header 'Content-Type: application/json' \
      --header 'user-id: ${ATLASSIAN_USER_ID}' \
      --data '{
        "entity": {
            "id": "${FILE_KEY}",
            "ari": "NOT_USED"
        },
        "disassociateFrom": {
            "ati": "ati:cloud:jira:issue",
            "ari": "ari:cloud:jira:${ATLASSIAN_CLOUD_ID}:issue/10002",
            "cloudId": "${ATLASSIAN_CLOUD_ID}",
            "id": "${JIRA_ISSUE_ID}"
        }
    }'
   ```

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

To run a database migration on your **development** environment:

1. Ensure that the application sandbox is running.
   ```shell
   npm run start:sandbox
   ```
2. Make schema changes in `prisma/schema.prisma`.
3. Generate a new migration. You will be prompted to name the migration.
   ```shell
   npm run db:migrate:dev
   ```
   This command triggers `@prisma/client` regeneration automatically. If you need to regenerate it manually, run
   `npm run db:generate`.

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
