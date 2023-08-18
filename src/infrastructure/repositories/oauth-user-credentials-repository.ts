import type { OAuthUserCredentials } from 'src/domain/entities/oauth-user-credentials';
import { OAuthUserCredentialsRepository } from 'src/domain/repositories/oauth-user-credentials-repository';

class OAuthUserCredentialsRepositoryImpl
	implements OAuthUserCredentialsRepository
{
	getOAuthToken(userId: string) {
		// TODO: fetch token from db
		return null;
	}
	upsertOAuthUserCredentials(credentials: OAuthUserCredentials) {
		// TODO: insert record into db
	}
}

export default new OAuthUserCredentialsRepositoryImpl();
