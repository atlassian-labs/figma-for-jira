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
	readonly database: {
		readonly host: string;
		readonly schema: string;
		readonly role: string;
		readonly password: string;
		readonly url: string;
	};
	readonly figma: {
		readonly oauthApiBaseUrl: string;
		readonly apiBaseUrl: string;
		readonly clientId: string;
		readonly clientSecret: string;
	};
};
