import type { Config } from '../config';

export const mockConfig: Config = {
	app: {
		baseUrl: 'https://www.app.figma.com',
		key: 'com.figma.jira-add-on-dev',
	},
	server: {
		port: 3000,
	},
	logging: {
		level: 'TEST',
	},
	figma: {
		webBaseUrl: 'https://www.figma.com',

		apiBaseUrl: 'https://api.figma.com',
		oauth2: {
			authorizationServerBaseUrl: 'https://www.figma.com',
			clientId: 'abc',
			clientSecret: '123',
			stateSecretKey:
				'024d768f25b5b7493812906e15ca4145884c361c2bf2dd0a60449eb8cbd5d06a',
			scope: 'files:read,file_dev_resources:read,file_dev_resources:write',
		},
	},
	jira: {
		connectKeyServerUrl: 'https://connect-install-keys.atlassian.com',
	},
};
