import { OAuthUserCredentials } from '../domain/entities/oauth-user-credentials';
import { OAuthUserCredentialsRepository } from '../domain/repositories/oauth-user-credentials-repository';

export const addOAuthCredentialsUseCase = (
	repository: OAuthUserCredentialsRepository,
	authDetails: OAuthUserCredentials,
) => {
	repository.upsertOAuthUserCredentials(authDetails);
};
