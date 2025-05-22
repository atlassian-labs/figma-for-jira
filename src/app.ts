// Must come before importing any instrumented module.
// eslint-disable-next-line import/no-unassigned-import
import './infrastructure/tracer';
import express, { json } from 'express';

import { getConfig } from './config';
import { errorHandlerMiddleware, httpLoggerMiddleware } from './web/middleware';
import { rootRouter } from './web/routes/router';

const app = express();

app.use(httpLoggerMiddleware);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
// Figma uses a base URL with a path for development purposes only.
app.use(getConfig().app.baseUrl.pathname, rootRouter);

// Error handling
app.use(errorHandlerMiddleware);

export default app;
