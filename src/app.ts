import express, { json } from 'express';

import logger from './infrastructure/logger';
import { RootRouter } from './routes/router';

const app = express();

app.use(logger.httpLogger);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(RootRouter);

export default app;
