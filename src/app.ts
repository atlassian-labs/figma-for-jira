import { PrismaClient } from '@prisma/client';
import express, { json } from 'express';

import logger from './infrastructure/logger';
import { PostgresConnectInstallationRepository } from './infrastructure/repositories/postgres-connect-installation-repository';
import { makeRootRouter } from './routes/router';

const app = express();

// DB
const prismaClient = new PrismaClient();
const connectInstallationRepository = new PostgresConnectInstallationRepository(
	prismaClient,
);

app.use(logger.httpLogger);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(makeRootRouter(connectInstallationRepository));

export default app;
