import { OAuthUserCredentialsCreateParams } from '../domain/entities';
import { oauthUserCredentialsRepository } from '../infrastructure/repositories';

const TOKEN_EXPIRATION_OFFSET_MILLIS = 60 * 60 * 1000; // 1 hour

export type AddOAuthCredentialsUseCaseParams = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresIn: number;
};

export const addOAuthCredentialsUseCase = {
	execute: async (params: AddOAuthCredentialsUseCaseParams) => {
		await oauthUserCredentialsRepository.upsert({
			atlassianUserId: params.atlassianUserId,
			accessToken: params.accessToken,
			refreshToken: params.refreshToken,
			expiresAt: new Date(Date.now() + params.expiresIn),
		});
	},
};
