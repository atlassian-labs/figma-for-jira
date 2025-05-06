import { readEnvVarInt, readEnvVarString } from './utils';

export type Config = {
	readonly app: {
		readonly baseUrl: string;
		readonly key: string;
		readonly basePath: string;
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
		readonly enabled: boolean;
	};
	readonly figma: {
		readonly domain: string;
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
				basePath: readEnvVarString('APP_BASE_PATH', ''),
			},
			server: {
				port: readEnvVarInt('SERVER_PORT'),
			},
			logging: {
				level: readEnvVarString('LOG_LEVEL', ''),
			},
			tracer: {
				service: readEnvVarString('DD_SERVICE', ''),
				env: readEnvVarString('DD_ENV', ''),
				enabled: readEnvVarString('DD_TRACE_ENABLED', '') === 'true',
			},
			figma: {
				domain: readEnvVarString('FIGMA_DOMAIN', 'figma.com'),
				webBaseUrl: readEnvVarString('FIGMA_WEB_BASE_URL'),
				apiBaseUrl: readEnvVarString('FIGMA_API_BASE_URL'),
				oauth2: {
					authorizationServerBaseUrl: readEnvVarString(
						'FIGMA_OAUTH2_AUTHORIZATION_SERVER_BASE_URL',
					),
					clientId: readEnvVarString('FIGMA_OAUTH2_CLIENT_ID'),
					clientSecret: readEnvVarString('FIGMA_OAUTH2_CLIENT_SECRET'),
					scope:
						'file_content:read,file_metadata:read,current_user:read,projects:read,file_dev_resources:read,file_dev_resources:write,webhooks:write',
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

export function getAppPath(path: string): string {
	const config = getConfig();
	return `${config.app.basePath}${path}`;
}

export function getAppUrl(path: string): string {
	const config = getConfig();
	return `${config.app.baseUrl}${config.app.basePath}${path}`;
}
