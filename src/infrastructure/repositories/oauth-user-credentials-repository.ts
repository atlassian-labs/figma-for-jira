import type { OAuthUserCredentials } from '../../domain/entities/oauth-user-credentials';
import { OAuthUserCredentialsRepository } from '../../domain/repositories/oauth-user-credentials-repository';
import logger from '../logger';

class OAuthUserCredentialsRepositoryImpl
	implements OAuthUserCredentialsRepository
{
	getOAuthToken(userId: string) {
		// TODO: fetch token from db
		logger.info('getOAuthToken()', userId);
		return null;
	}
	upsertOAuthUserCredentials(credentials: OAuthUserCredentials) {
		// TODO: insert record into db
		logger.info('upsertOAuthUserCredentials()', credentials);
	}
}

export default new OAuthUserCredentialsRepositoryImpl();
