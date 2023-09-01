import { pinoHttp } from 'pino-http';

import { getLogger } from '../../infrastructure';

const isTest = process.env.NODE_ENV === 'test';
export const httpLoggerMiddleware = pinoHttp({
	logger: getLogger(),
	autoLogging: {
		ignore(req) {
			if (req.url === '/healthcheck') {
				return true;
			}

			return false;
		},
	},
	...(isTest && { useLevel: 'silent' }),
});
