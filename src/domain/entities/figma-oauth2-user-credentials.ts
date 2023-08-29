import { Duration } from '../../common/duration';

const TOKEN_EXPIRATION_OFFSET = Duration.ofMinutes(60);

export class FigmaOAuth2UserCredentials {
	constructor(
		readonly id: number,
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

export type FigmaUserCredentialsCreateParams = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresAt: Date;
};
