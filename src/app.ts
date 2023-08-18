import express, { json } from 'express';
import { RootRouter } from './routes/router';
import logger from './infrastructure/logger';

const app = express();

app.use(logger.httpLogger);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(RootRouter);

export default app;
