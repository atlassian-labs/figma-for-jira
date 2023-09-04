import { pinoHttp } from 'pino-http';

import { getLogger } from '../../infrastructure';

export const httpLoggerMiddleware = pinoHttp({
	logger: getLogger(),
	autoLogging: {
		ignore(req) {
			return req.url === '/healthcheck';
		},
	},
	customLogLevel(req, res) {
		if (process.env.NODE_ENV === 'test') {
			return 'silent';
		}
		if (res.statusCode >= 500 && res.statusCode < 600) {
			return 'error';
		}

		return 'info';
	},
});
