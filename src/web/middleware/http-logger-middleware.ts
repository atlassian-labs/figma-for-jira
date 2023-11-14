import type { SerializedRequest, SerializedResponse } from 'pino';
import { pinoHttp } from 'pino-http';

import { getLogger } from '../../infrastructure';

export const httpLoggerMiddleware = pinoHttp({
	logger: getLogger(),
	// Exclude potentially sensitive information from logs (e.g., HTTP headers, remote address, etc.).
	// See for more detail:
	// - https://github.com/pinojs/pino-http#custom-serializers
	// - https://github.com/pinojs/pino-http/issues/5
	serializers: {
		req: (req: SerializedRequest) => ({
			id: req.id,
			method: req.method,
			url: req.url,
		}),
		res: (res: SerializedResponse) => ({
			statusCode: res.statusCode,
		}),
	},
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
