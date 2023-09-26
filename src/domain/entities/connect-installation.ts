/**
 * A tenant information required for signing and verifying requests to the Atlassian Product API.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/connect-app-descriptor/#lifecycle
 */
export type ConnectInstallation = {
	/**
	 * A surrogate key to uniquely identify the installation.
	 */
	id: string;
	/**
	 * A key of the Connect App that was installed into the Atlassian Product, as it appears in the app's descriptor.
	 */
	key: string;
	/**
	 * Identifying key for the Atlassian product tenant that the app was installed into.
	 */
	clientKey: string;
	/**
	 * A shared secret. Use this it to sign outgoing JWT tokens and validate incoming JWT tokens when communicate with Atlassian API.
	 */
	sharedSecret: string;
	/**
	 * A base URL of a target Atlassian product instance.
	 */
	baseUrl: string;
	/**
	 * If the Atlassian product instance has an associated custom domain, this is the URL through which users will access the product.
	 * If a custom domain is not configured, this field will still be present but will be the same as the `baseUrl`.
	 */
	displayUrl: string;
};

export type ConnectInstallationCreateParams = Omit<ConnectInstallation, 'id'>;
