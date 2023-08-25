import { Logger, pino } from 'pino';
import pretty from 'pino-pretty';

import { getConfig } from '../config';

const prettyStream = pretty({
	colorize: true,
	sync: true,
});

let logger: Logger | undefined;

export function getLogger(): Logger {
	if (!logger) {
		const env = process.env.NODE_ENV;
		const isProduction = env === 'production';
		const defaultLogLevel =
			getConfig().logging.level || (isProduction ? 'info' : 'debug');

		logger = isProduction
			? pino({
					level: defaultLogLevel,
			  })
			: pino({ level: defaultLogLevel }, prettyStream);
	}

	return logger;
}
