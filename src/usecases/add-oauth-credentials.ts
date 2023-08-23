import { OAuthUserCredentials } from '../domain/entities/oauth-user-credentials';
import { OAuthUserCredentialsRepository } from '../domain/repositories/oauth-user-credentials-repository';

export class AddOAuthCredentialsUseCase {
	oauthUserCredentialsRepository: OAuthUserCredentialsRepository;

	constructor(oauthUserCredentialsRepository: OAuthUserCredentialsRepository) {
		this.oauthUserCredentialsRepository = oauthUserCredentialsRepository;
	}

	execute = async (credentials: OAuthUserCredentials) => {
		await this.oauthUserCredentialsRepository.upsertOAuthUserCredentials(
			credentials,
		);
	};
}
