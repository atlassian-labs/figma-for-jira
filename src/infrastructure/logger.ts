import type { DestinationStream, Logger } from 'pino';
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
		const isProduction = env === 'production';
		const isTest = env === 'test';
		const defaultLogLevel =
			getConfig().logging.level || (isProduction ? 'info' : 'debug');

		if (isProduction) {
			logger = pino({
				level: defaultLogLevel,
				redact: redactOptions,
			});
		} else {
			/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call */
			// This needs to be lazily required since 'pino-pretty' won't be available in production builds
			const pretty = require('pino-pretty');
			const prettyStream = pretty({
				colorize: true,
				sync: true,
			});
			/* eslint-enable */

			logger = pino(
				{
					level: isTest ? 'silent' : defaultLogLevel,
					redact: redactOptions,
				},
				prettyStream as DestinationStream,
			);
		}
	}

	return logger;
}
