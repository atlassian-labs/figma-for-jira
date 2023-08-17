import { OAuthUserCredentials } from 'src/domain/entities/oauth-user-credentials';
import { OAuthUserCredentialsRepository } from 'src/domain/repositories/oauth-user-credentials-repository';

export const addOAuthCredentialsUseCase = (
	repository: OAuthUserCredentialsRepository,
	authDetails: OAuthUserCredentials,
) => {
	repository.upsertOAuthUserCredentials(authDetails);
};
