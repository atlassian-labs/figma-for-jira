import type { Logger } from 'pino';
import { pino } from 'pino';

import { getConfig } from '../config';

let logger: Logger | undefined;

export const redactOptions = {
	paths: [
		'headers.Authorization',
		'*.headers.Authorization',
		'*.*.headers.Authorization',
		'*.*.*.headers.Authorization',
		'err.config.data',
		'err.config.url',
	],
	censor: (value: unknown, path: string[]) => {
		if (path.includes('url')) {
			return (value as string).replace(/(=).*?(&|$)/g, '=[REDACTED]$2');
		}

		return '[REDACTED]';
	},
};

export function getLogger(): Logger {
	if (!logger) {
		const env = process.env.NODE_ENV;
		const isTest = env === 'test';

		if (isTest) {
			logger = pino({
				level: 'silent',
				redact: redactOptions,
				sync: true,
			});
		} else {
			logger = pino({
				level: getConfig().logging.level || 'info',
				redact: redactOptions,
			});
		}
	}

	return logger;
}
