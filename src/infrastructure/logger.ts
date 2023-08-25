import { pino } from 'pino';
import pretty from 'pino-pretty';

import { getConfig } from '../config';

const isProduction = process.env.NODE_ENV === 'production';
const defaultLogLevel =
	getConfig().logging.level || (isProduction ? 'info' : 'debug');

const prettyStream = pretty({
	colorize: true,
	sync: true,
});

export const logger = isProduction
	? pino({
			level: defaultLogLevel,
	  })
	: pino({ level: defaultLogLevel }, prettyStream);
