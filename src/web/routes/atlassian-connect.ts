import { HttpStatusCode } from 'axios';
import type { Request, Response } from 'express';

import { getConfig } from '../../config';

const figmaScope =
	'files:read,file_dev_resources:read,file_dev_resources:write';

export const connectDescriptorGet = (_: Request, res: Response) => {
	res.status(HttpStatusCode.Ok).json(connectAppDescriptor);
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
	 */
	modules: {
		webPanels: [
			{
				url: '/public/issue-panel.html?issueId={issue.id}&issueKey={issue.key}',
				location: 'atl.jira.view.issue.left.context',
				weight: 250,
				key: 'figma-web-panel-jira-issue',
				name: {
					value: 'Designs',
				},
				conditions: [
					{
						condition: 'feature_flag_service_flag',
						params: {
							featureKey: 'atlas.figma-design-section.enabled',
						},
					},
				],
			},
		],
		/**
		 * This module allows third-party providers to send design information to Jira and associate it with an issue.
		 *
		 * https://developer.atlassian.com/cloud/jira/software/modules/design/
		 */
		jiraDesignInfoProvider: {
			homeUrl: 'https://www.figma.com/',
			name: {
				value: 'Figma',
			},
			key: 'figma-integration',
			handledDomainName: 'figma.com',
			logoUrl: `${getConfig().app.baseUrl}/public/figma-logo.svg`,
			documentationUrl:
				'https://help.figma.com/hc/en-us/articles/360039827834-Jira-and-Figma',
			actions: {
				associateEntity: {
					templateUrl: `${getConfig().app.baseUrl}/entities/associateEntity`,
				},
				disassociateEntity: {
					templateUrl: `${getConfig().app.baseUrl}/entities/disassociateEntity`,
				},
				grant3LO: {
					templateUrl: `${getConfig().figma.apiBaseUrl}/oauth?client_id=${
						getConfig().figma.clientId
					}&redirect_uri=${
						getConfig().app.baseUrl
					}/auth/callback&scope=${figmaScope}&state={state}&response_type=code`,
				},
				check3LO: {
					templateUrl: `${
						getConfig().app.baseUrl
					}/auth/check3LO?userId={userId}`,
				},
			},
		},
	},
};
