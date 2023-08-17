import { OAuthDelegate } from 'src/domain/entities/oauth-delegate';
import { OAuthDelegateRepository } from 'src/domain/repositories/oauth-delegate-repository';

export const delegateOAuthUseCase = (
	repository: OAuthDelegateRepository,
	authDetails: OAuthDelegate,
) => {
	repository.upsertOAuthDelegate(authDetails);
};
