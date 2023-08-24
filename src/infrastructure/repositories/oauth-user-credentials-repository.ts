import type { OAuthUserCredential as PrismaOAuthUserCredentials } from '@prisma/client';

import { logger } from '..';
import type {
	OAuthUserCredentials,
	OAuthUserCredentialsCreateParams,
} from '../../domain/entities';
import { getPrismaClient } from '../../infrastructure/repositories/prisma-client';

const mapToDomainType = ({
	id,
	atlassianUserId,
	accessToken,
	refreshToken,
	expiresIn,
}: PrismaOAuthUserCredentials): OAuthUserCredentials => ({
	id,
	atlassianUserId,
	accessToken,
	refreshToken,
	expiresIn,
});

export class OAuthUserCredentialsRepository {
	findAccessToken = async (atlassianUserId: string): Promise<string | null> => {
		try {
			const credentials = await getPrismaClient().oAuthUserCredential.findFirst(
				{
					where: { atlassianUserId },
				},
			);
			return credentials?.accessToken ?? null;
		} catch (err) {
			logger.error(
				err,
				'Failed to retrieve credentials for atlassianUserId: %s',
				atlassianUserId,
			);
			throw err;
		}
	};

	upsert = async (
		credentials: OAuthUserCredentialsCreateParams,
	): Promise<OAuthUserCredentials> => {
		try {
			const result = await getPrismaClient().oAuthUserCredential.upsert({
				create: credentials,
				update: credentials,
				where: { atlassianUserId: credentials.atlassianUserId },
			});
			return mapToDomainType(result);
		} catch (err) {
			logger.error(
				err,
				'Failed to upsert credentials for user %s',
				credentials.atlassianUserId,
			);
			throw err;
		}
	};

	delete = async (atlassianUserId: string): Promise<OAuthUserCredentials> => {
		try {
			const result = await getPrismaClient().oAuthUserCredential.delete({
				where: { atlassianUserId },
			});
			return mapToDomainType(result);
		} catch (err) {
			logger.error(
				err,
				'Failed to delete credentials for user %s',
				atlassianUserId,
			);
			throw err;
		}
	};
}

export const oauthUserCredentialsRepository =
	new OAuthUserCredentialsRepository();
