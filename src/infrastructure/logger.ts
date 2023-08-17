import pino, { type Logger as PinoLogger } from "pino";
import pinoHttp, { type HttpLogger } from "pino-http";
import { Logger } from "../domain/services/logger";

const isProduction = process.env.NODE_ENV === "production";

const defaultLogLevel = process.env.LOG_LEVEL || "info";

const productionTargets = [
	{
		// TODO: Write to an actual log server like Splunk or Sentry
		target: "pino/file",
		level: defaultLogLevel,
		options: { destination: "server.log" },
	},
];

const developmentTargets = [
	{
		level: defaultLogLevel,
		target: "pino-pretty",
		options: {},
	},
];

const transport = pino.transport({
	targets: isProduction
		? productionTargets
		: [...productionTargets, ...developmentTargets],
});

class PinoLoggerImpl implements Logger {
	logger: PinoLogger;
	httpLogger: HttpLogger;
	constructor() {
		this.logger = pino(transport);
		this.httpLogger = pinoHttp(this.logger, transport);
	}

	info(message: string, ...args: any[]) {
		this.logger.info(message, args);
	}

	debug(message: string, ...args: any[]) {
		this.logger.debug(message, args);
	}

	error(message: string, ...args: any[]) {
		this.logger.error(message, args);
	}
}

export default new PinoLoggerImpl();
