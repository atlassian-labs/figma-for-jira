import { buildAppUrl, getConfig, getOriginalConnectAppBaseUrl } from './config';

const APP_NAME = 'Figma for JIRA Cloud';

/**
 * General schema can be seen here: https://bitbucket.org/atlassian/connect-schemas/raw/master/jira-global-schema.json
 */
export const connectAppDescriptor = {
	/**
	 * Name of the Connect app
	 */
	name: APP_NAME,

	/**
	 * Description for the Connect app
	 */
	description: 'Attach Figma designs and prototypes to JIRA issues.',

	/**
	 *  A unique key to identify your Connect app. This key must be <= 64 characters.
	 */
	key: getConfig().app.key,

	/**
	 * The base url of the server, which is used for all communications between Connect and the app.
	 */
	baseUrl: getOriginalConnectAppBaseUrl(),

	/**
	 * The vendor who is offering this Connect app.
	 */
	vendor: {
		name: 'Figma, Inc.',
		url: 'https://www.figma.com',
	},

	/**
	 * Defines the authentication type to use when signing requests between the host application and the Connect app.
	 * Types include: `jwt`, `JWT`, `none`, `NONE`
	 *
	 * Pages defined in the Connect app(by default) run within the iframe inside Jira,
	 * Defining this authentication will pass the JWT token for each page running within the iframe.
	 */
	authentication: {
		type: 'jwt',
	},

	/**
	 * Sets the scopes requested by the app
	 * https://developer.atlassian.com/cloud/jira/platform/scopes-for-connect-apps/
	 */
	scopes: ['READ', 'WRITE', 'DELETE'],

	/**
	 * The API version is an OPTIONAL integer. If omitted we will infer an API version of 1.
	 */
	apiVersion: 1,

	/**
	 * Allows an app to register callbacks for events that occur in the lifecycle of an installation.
	 * When a lifecycle event is fired, a POST request will be made to the appropriate URL registered for the event.
	 *
	 * https://developer.atlassian.com/cloud/jira/platform/connect-app-descriptor/#lifecycle
	 *
	 */
	lifecycle: {
		installed: '/lifecycleEvents/installed',
		uninstalled: '/lifecycleEvents/uninstalled',
	},

	/**
	 * Extensions for the different parts of Jira
	 * like links, panels, pages, permissions, workflows etc.
	 * https://developer.atlassian.com/cloud/jira/platform/about-connect-modules-for-jira/
	 */
	modules: {
		configurePage: {
			key: 'figma-configure',
			name: {
				value: 'Configure',
			},
			url: 'static/admin',
			conditions: [{ condition: 'user_is_admin' }],
		},
		webSections: [
			{
				key: 'figma-addon-admin-section',
				name: {
					value: APP_NAME,
				},
				location: 'admin_plugins_menu',
			},
		],
		adminPages: [
			{
				key: 'figma-addon-admin-section-configure',
				name: {
					value: 'Configure',
				},
				location: 'admin_plugins_menu/figma-addon-admin-section',
				url: 'static/admin',
				conditions: [
					{
						condition: 'user_is_admin',
					},
				],
			},
		],
		/**
		 * This module allows third-party providers to send design information to Jira and associate it with an issue.
		 */
		jiraDesignInfoProvider: {
			homeUrl: getConfig().figma.webBaseUrl.toString(),
			name: {
				value: 'Figma',
			},
			key: 'figma-integration',
			handledDomainName: getConfig().figma.domain,
			logoUrl: buildAppUrl('static/figma-logo.svg'),
			documentationUrl:
				'https://help.figma.com/hc/en-us/articles/360039827834-Jira-and-Figma',
			actions: {
				getEntityByUrl: {
					templateUrl: buildAppUrl('entities/getEntityByUrl'),
				},
				onEntityAssociated: {
					templateUrl: buildAppUrl('entities/onEntityAssociated'),
				},
				onEntityDisassociated: {
					templateUrl: buildAppUrl('entities/onEntityDisassociated'),
				},
				checkAuth: {
					templateUrl: buildAppUrl('auth/checkAuth'),
				},
			},
		},
	},
};
