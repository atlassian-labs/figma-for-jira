import { OAuthUserCredentialsCreateParams } from '../domain/entities/oauth-user-credentials';
import { oauthUserCredentialsRepository } from '../infrastructure/repositories';

export const addOAuthCredentialsUseCase = {
	execute: async (credentials: OAuthUserCredentialsCreateParams) => {
		await oauthUserCredentialsRepository.upsertOAuthUserCredentials(
			credentials,
		);
	},
};
