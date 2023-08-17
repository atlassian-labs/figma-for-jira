import type { OAuthDelegate } from 'src/domain/entities/oauth-delegate';
import { OAuthDelegateRepository } from 'src/domain/repositories/oauth-delegate-repository';

class OAuthDelegateRepositoryImpl implements OAuthDelegateRepository {
	getOAuthToken(userId: string) {
		// TODO: fetch token from db
		return null;
	}
	upsertOAuthDelegate(installation: OAuthDelegate) {
		// TODO: insert record into db
	}
}

export default new OAuthDelegateRepositoryImpl();
