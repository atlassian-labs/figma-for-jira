import { OAuthDelegate } from '../entities/oauth-delegate';

export interface OAuthDelegateRepository {
	getOAuthToken: (key: string) => string | null;
	upsertOAuthDelegate: (installation: OAuthDelegate) => void;
}
