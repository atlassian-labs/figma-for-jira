import { Config } from './types';
import { readEnvVarInt, readEnvVarString } from './utils';

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
		};
	}

	return config;
};
