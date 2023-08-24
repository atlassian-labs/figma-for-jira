const TOKEN_EXPIRATION_OFFSET_MILLIS = 60 * 60 * 1000; // 1 hour

export class OAuthUserCredentials {
	constructor(
		readonly id: number,
		readonly atlassianUserId: string,
		readonly accessToken: string,
		readonly refreshToken: string,
		readonly expiresAt: Date,
	) {}

	get refreshRequired(): boolean {
		return (
			Date.now() < this.expiresAt.getTime() - TOKEN_EXPIRATION_OFFSET_MILLIS
		);
	}
}

export type OAuthUserCredentialsCreateParams = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresAt: Date;
};
