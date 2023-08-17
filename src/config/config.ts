import 'dotenv/config';
import { Config } from './types';
import { readEnvVarString, readEnvVarInt } from './utils';

const config: Config = {
	app: {
		baseUrl: readEnvVarString('APP_URL'),
		key: readEnvVarString('APP_KEY'),
	},
	server: {
		port: readEnvVarInt('SERVER_PORT'),
	},
	logging: {
		level: readEnvVarString('LOG_LEVEL', ''),
	},
	database: {
		host: readEnvVarString('PG_FIGMA_FOR_JIRA_DB_HOST'),
		schema: readEnvVarString('PG_FIGMA_FOR_JIRA_DB_SCHEMA'),
		role: readEnvVarString('PG_FIGMA_FOR_JIRA_DB_ROLE'),
		password: readEnvVarString('PG_FIGMA_FOR_JIRA_DB_PASSWORD'),
	},
};

export default config;
