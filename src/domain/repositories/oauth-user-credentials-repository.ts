import { OAuthUserCredentials } from '../entities/oauth-user-credentials';

export interface OAuthUserCredentialsRepository {
	getOAuthToken: (userId: string) => Promise<string | null>;
	upsertOAuthUserCredentials: (
		credentials: OAuthUserCredentials,
	) => Promise<OAuthUserCredentials>;
	deleteOAuthUserCredentials: (userId: string) => Promise<OAuthUserCredentials>;
}
