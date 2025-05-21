// Must come before importing any instrumented module.
// eslint-disable-next-line import/no-unassigned-import
import './infrastructure/tracer';
import express, { json } from 'express';

import { getAppBaseUrl } from './config';
import { errorHandlerMiddleware, httpLoggerMiddleware } from './web/middleware';
import { rootRouter } from './web/routes/router';

const app = express();

app.use(httpLoggerMiddleware);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(rootRouter);

// For internal Figma development purposes only.
const basePath = getAppBaseUrl().pathname;
if (basePath !== '/') {
	app.use(basePath, rootRouter);
}

// Error handling
app.use(errorHandlerMiddleware);

export default app;
