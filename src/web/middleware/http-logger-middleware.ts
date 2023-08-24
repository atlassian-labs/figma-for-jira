import { pinoHttp } from 'pino-http';

import { logger } from '../../infrastructure';

const isTest = process.env.NODE_ENV === 'test';
export const httpLoggerMiddleware = pinoHttp({
	logger: logger,
	...(isTest && { useLevel: 'silent' }),
});
