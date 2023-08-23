// eslint-disable-next-line import/no-unassigned-import
import 'dotenv/config';
import express, { json } from 'express';

import { logger } from './infrastructure';
import { rootRouter } from './web/routes/router';

const app = express();

app.use(logger.httpLogger);

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(rootRouter);

export default app;
