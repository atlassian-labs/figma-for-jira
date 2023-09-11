import { readEnvVarInt, readEnvVarString } from './utils';

export type Config = {
	readonly app: {
		readonly baseUrl: string;
		readonly key: string;
	};
	readonly server: {
		readonly port: number;
	};
	readonly logging: {
		readonly level: string;
	};
	readonly figma: {
		readonly baseUrl: string;
		readonly liveEmbedBaseUrl: string;
		readonly oauthApiBaseUrl: string;
		readonly apiBaseUrl: string;
		readonly clientId: string;
		readonly clientSecret: string;
	};
	readonly jira: {
		readonly connectKeyServerUrl: string;
	};
};

let config: Config;

export const getConfig = (): Config => {
	if (!config) {
		config = {
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
			figma: {
				baseUrl: readEnvVarString('FIGMA_BASE_URL'),
				liveEmbedBaseUrl: readEnvVarString('FIGMA_LIVE_EMBED_BASE_URL'),
				oauthApiBaseUrl: readEnvVarString('FIGMA_OAUTH_API_BASE_URL'),
				apiBaseUrl: readEnvVarString('FIGMA_API_BASE_URL'),
				clientId: readEnvVarString('FIGMA_OAUTH_CLIENT_ID'),
				clientSecret: readEnvVarString('FIGMA_OAUTH_CLIENT_SECRET'),
			},
			jira: {
				connectKeyServerUrl: readEnvVarString('JIRA_CONNECT_KEY_SERVER_URL'),
			},
		};
	}

	return config;
};
