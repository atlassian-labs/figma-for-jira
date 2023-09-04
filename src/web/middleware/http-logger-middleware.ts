import { pinoHttp } from 'pino-http';

import { getLogger } from '../../infrastructure';

const isTest = process.env.NODE_ENV === 'test';
export const httpLoggerMiddleware = pinoHttp({
	logger: getLogger(),
	autoLogging: {
		ignore(req) {
			return req.url === '/healthcheck';
		},
	},
	customLogLevel(req, res) {
		if (res.statusCode >= 500 && res.statusCode < 600) {
			return 'error';
		}

		return 'info';
	},
	...(isTest && { useLevel: 'silent' }),
});
