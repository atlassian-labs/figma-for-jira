// Must come before importing any instrumented module.
// eslint-disable-next-line import/no-unassigned-import
import './infrastructure/tracer';
import express, { json } from 'express';

import { errorHandlerMiddleware, httpLoggerMiddleware } from './web/middleware';
import { rootRouter } from './web/routes/router';
import { getConfig } from './config';

const app = express();

app.use(httpLoggerMiddleware);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(rootRouter);

// For internal Figma development purposes only.
if (getConfig().app.basePath.length > 0) {
  app.use(getConfig().app.basePath, rootRouter);
}

// Error handling
app.use(errorHandlerMiddleware);

export default app;
