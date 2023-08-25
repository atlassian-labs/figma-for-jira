import { pinoHttp } from 'pino-http';

import { getLogger } from '../../infrastructure';

const isTest = process.env.NODE_ENV === 'test';
export const httpLoggerMiddleware = pinoHttp({
	logger: getLogger(),
	...(isTest && { useLevel: 'silent' }),
});
