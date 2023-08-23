import { PrismaClient } from '@prisma/client';
import express, { json } from 'express';

import logger from './infrastructure/logger';
import { OAuthUserCredentialsRepositoryImpl } from './infrastructure/repositories/oauth-user-credentials-repository';
import { PostgresConnectInstallationRepository } from './infrastructure/repositories/postgres-connect-installation-repository';
import { makeRootRouter } from './routes/router';
import { AddOAuthCredentialsUseCase } from './usecases/add-oauth-credentials';
import { InstalledUseCase } from './usecases/installed';

const app = express();

// DB
const prismaClient = new PrismaClient();
const connectInstallationRepository = new PostgresConnectInstallationRepository(
	prismaClient,
);
const oauthUserCredentialsRepository = new OAuthUserCredentialsRepositoryImpl(
	prismaClient,
);

// Use cases
const installedUseCase = new InstalledUseCase(connectInstallationRepository);
const addOAuthCredentialsUseCase = new AddOAuthCredentialsUseCase(
	oauthUserCredentialsRepository,
);

app.use(logger.httpLogger);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(makeRootRouter(installedUseCase, addOAuthCredentialsUseCase));

export default app;
