export type OAuthUserCredentials = {
	id: number;
	atlassianUserId: string;
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
};

export type OAuthUserCredentialsCreateParams = Omit<OAuthUserCredentials, 'id'>;
