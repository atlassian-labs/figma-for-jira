import type { Config } from '../config';

export const mockConfig: Config = {
	app: {
		baseUrl: 'https://www.app.figma.com',
		key: 'com.figma.jira-addon-dev',
	},
	server: {
		port: 3000,
	},
	logging: {
		level: 'TEST',
	},
	figma: {
		webBaseUrl: 'https://www.figma.com',
		oauthApiBaseUrl: 'https://www.figma.com',
		apiBaseUrl: 'https://api.figma.com',
		clientId: 'abc',
		clientSecret: '123',
	},
	jira: {
		connectKeyServerUrl: 'https://connect-install-keys.atlassian.com',
	},
};
