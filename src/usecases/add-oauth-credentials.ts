import { OAuthUserCredentialsCreateParams } from '../domain/entities';
import { oauthUserCredentialsRepository } from '../infrastructure/repositories';

export const addOAuthCredentialsUseCase = {
	execute: async (credentials: OAuthUserCredentialsCreateParams) => {
		await oauthUserCredentialsRepository.upsert(
			credentials,
		);
	},
};
