import { OAuthUserCredentials } from '../entities/oauth-user-credentials';

export interface OAuthUserCredentialsRepository {
	getOAuthToken: (atlassianUserId: string) => Promise<string | null>;
	upsertOAuthUserCredentials: (
		credentials: OAuthUserCredentials,
	) => Promise<OAuthUserCredentials>;
	deleteOAuthUserCredentials: (
		atlassianUserId: string,
	) => Promise<OAuthUserCredentials>;
}
