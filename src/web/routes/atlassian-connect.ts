import type { Request, Response } from 'express';

import { getConfig } from '../../config';

export const connectDescriptorGet = (_: Request, res: Response) => {
	res.status(200).json(connectAppDescriptor);
};

/**
 * General schema can be seen here: https://bitbucket.org/atlassian/connect-schemas/raw/master/jira-global-schema.json
 */
export const connectAppDescriptor = {
	/**
	 * Name of the Connect app
	 */
	name: 'Figma for Jira',

	/**
	 * Description for the Connect app
	 */
	description: 'Figma for Jira',

	/**
	 *  A unique key to identify your Connect app. This key must be <= 64 characters.
	 */
	key: getConfig().app.key,

	/**
	 * The base url of the server, which is used for all communications between Connect and the app.
	 *
	 * The tunneled URL which is set in the `prestart.ts`
	 */
	baseUrl: getConfig().app.baseUrl,

	/**
	 * The vendor who is offering this Connect app.
	 */
	vendor: {
		name: 'Atlassian',
		url: 'https://atlassian.com',
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
	scopes: ['READ', 'WRITE'],

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
	 */
	modules: {},
};
