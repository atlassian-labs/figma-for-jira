import { Duration } from '../../common/duration';

const TOKEN_EXPIRATION_OFFSET = Duration.ofMinutes(60);

export class FigmaOAuth2UserCredentials {
	constructor(
		readonly id: string,
		readonly atlassianUserId: string,
		readonly accessToken: string,
		readonly refreshToken: string,
		readonly expiresAt: Date,
	) {}

	isExpired(): boolean {
		return (
			Date.now() >
			this.expiresAt.getTime() - TOKEN_EXPIRATION_OFFSET.asMilliseconds
		);
	}
}

export type FigmaOAuth2UserCredentialsCreateParams = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresAt: Date;
};
