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
	getOAuthToken: (atlassianUserId: string) => Promise<string | null>;
	upsertOAuthUserCredentials: (
		credentials: OAuthUserCredentialsCreateParams,
	) => Promise<OAuthUserCredentials>;
	deleteOAuthUserCredentials: (
		atlassianUserId: string,
	) => Promise<OAuthUserCredentials>;

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
				`Failed to retrieve credentials for atlassianUserId: ${atlassianUserId} ${err}`,
				err,
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
				`Failed to upsert credentials for user ${credentials.atlassianUserId} ${err}`,
				err,
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
				`Failed to delete credentials for user ${atlassianUserId} ${err}`,
				err,
			);
			throw err;
		}
	};
}

export const oauthUserCredentialsRepository =
	new OAuthUserCredentialsRepository();
