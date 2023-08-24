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
};
