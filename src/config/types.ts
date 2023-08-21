export type Config = {
	app: {
		baseUrl: string;
		key: string;
	};
	server: {
		port: number;
	};
	logging: {
		level: string;
	};
	database: {
		host: string;
		schema: string;
		role: string;
		password: string;
		url: string;
	};
};
