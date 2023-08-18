import { OAuthUserCredentials } from '../entities/oauth-user-credentials';

export interface OAuthUserCredentialsRepository {
	getOAuthToken: (userId: string) => string | null;
	upsertOAuthUserCredentials: (credentials: OAuthUserCredentials) => void;
}
