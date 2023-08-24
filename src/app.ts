// eslint-disable-next-line import/no-unassigned-import
import 'dotenv/config';
import express, { json } from 'express';

import { httpLoggerMiddleware } from './web/middleware';
import { rootRouter } from './web/routes/router';

const app = express();

app.use(httpLoggerMiddleware);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(rootRouter);

export default app;
