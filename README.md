# Atlassian Connect Node Example App

## About

This repository contains an example [Express](https://expressjs.com/en/4x/api.html) server for building an [Atlassian Connect app](https://developer.atlassian.com/cloud/jira/platform/getting-started-with-connect/).
This app is aimed to help you to easily add your integration in Jira.

## Table of Contents

- [Pre-requisites](#pre-requisites)
- [Getting started](#getting-started)
- [Manual Install](#manually-installing-the-app)
- [Running your application](#running-your-application)
- [Testing](#testing)
- [Getting help](#getting-help)
- [License](#license)

## Pre-requisites

- [Node](https://nodejs.org)
- [yarn](https://yarnpkg.com/getting-started/install)(recommended) or npm
- [docker & docker-compose](https://docs.docker.com/engine/install/)
- [ngrok account](https://ngrok.com/)

## Getting started

- **Installing dependencies**

  - Run `yarn install` (recommended) or `npm install` for installing all the dependencies for this app.

- **Configuration**

  - We are using [ngrok](https://ngrok.com/docs/getting-started) for tunnelling. You'll need to create an ngrok
    account to get access to the auth token.
  - Open your .env file and fill in _all the missing fields_

- **Running the sandbox**

  - Run `yarn start:sandbox` to bring up a Postgres for the app in Docker

- **Starting the tunnel**

  - Run `yarn start:tunnel` to create an ngrok tunnel

> **Note:** _If you are using a free version of ngrok, please open the tunneled URL first. This needs to be done to bypass the ngrok browser warning. Just visit your ngrok tunnel URL in a browser and click on the Visit button._

- **Running the app**
  - Run `yarn start` to begin running the app in development mode

## Installing the App

To install the app, first ensure both the ngrok tunnel and the app are running, and you've filled out the required
values in the your `.env` file. Then run `yarn installApp`. The app will be installed to the Jira instance specified by
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

## Testing

We have added a basic end to end test for installing and uninstalling the app, using [playwright](https://playwright.dev/docs/intro). You can add your own test cases on top of it.

To run the end to end test, please add the values for `ATLASSIAN_URL`, `JIRA_ADMIN_EMAIL` and `JIRA_ADMIN_API_TOKEN` in the `.env` file. Then simply run `yarn test:e2e` in the terminal.

## Getting help

If you have feedback, found a bug or need some help, please create a [new issue in this repo](https://github.com/atlassian/atlassian-connect-example-app-node/issues/new/choose).

## License

The project is available as open source under the terms of the [MIT License](./LICENSE).
