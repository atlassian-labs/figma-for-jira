export type ConnectInstallation = {
	id: number;
	key: string;
	clientKey: string;
	sharedSecret: string;
	baseUrl: string;
	displayUrl: string;
};

export type ConnectInstallationCreateParams = Omit<ConnectInstallation, 'id'>;
