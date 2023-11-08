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
	readonly tracer: {
		readonly service: string;
		readonly env: string;
	};
	readonly figma: {
		readonly webBaseUrl: string;
		readonly apiBaseUrl: string;
		readonly oauth2: {
			readonly authorizationServerBaseUrl: string;
			readonly clientId: string;
			readonly clientSecret: string;
			readonly scope: string;
			readonly stateSecretKey: string;
		};
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
			tracer: {
				service: readEnvVarString('DD_SERVICE'),
				env: readEnvVarString('DD_ENV'),
			},
			figma: {
				webBaseUrl: readEnvVarString('FIGMA_WEB_BASE_URL'),
				apiBaseUrl: readEnvVarString('FIGMA_API_BASE_URL'),
				oauth2: {
					authorizationServerBaseUrl: readEnvVarString(
						'FIGMA_OAUTH2_AUTHORIZATION_SERVER_BASE_URL',
					),
					clientId: readEnvVarString('FIGMA_OAUTH2_CLIENT_ID'),
					clientSecret: readEnvVarString('FIGMA_OAUTH2_CLIENT_SECRET'),
					scope:
						'files:read,file_dev_resources:read,file_dev_resources:write,webhooks:write',
					stateSecretKey: readEnvVarString('FIGMA_OAUTH2_STATE_SECRET_KEY'),
				},
			},
			jira: {
				connectKeyServerUrl: readEnvVarString('JIRA_CONNECT_KEY_SERVER_URL'),
			},
		};
	}

	return config;
};
