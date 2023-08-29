import { DestinationStream, Logger, pino } from 'pino';

import { getConfig } from '../config';

let logger: Logger | undefined;

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
				{ level: isTest ? 'silent' : defaultLogLevel },
				prettyStream as DestinationStream,
			);
		}
	}

	return logger;
}
