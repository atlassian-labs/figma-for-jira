import type { OAuthUserCredential as PrismaOAuthUserCredentials } from '@prisma/client';

import { logger } from '..';
import {
	OAuthUserCredentials,
	OAuthUserCredentialsCreateParams,
} from '../../domain/entities';
import { getPrismaClient } from './prisma-client';

export class OAuthUserCredentialsRepository {
	find = async (
		atlassianUserId: string,
	): Promise<OAuthUserCredentials | null> => {
		try {
			const credentials = await getPrismaClient().oAuthUserCredential.findFirst(
				{
					where: { atlassianUserId },
				},
			);

			if (!credentials) return null;

			return this.mapToDomainModel(credentials);
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
			const params: Omit<PrismaOAuthUserCredentials, 'id'> = credentials;
			const result = await getPrismaClient().oAuthUserCredential.upsert({
				create: params,
				update: params,
				where: { atlassianUserId: credentials.atlassianUserId },
			});
			return this.mapToDomainModel(result);
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
			return this.mapToDomainModel(result);
		} catch (err) {
			logger.error(
				`Failed to delete credentials for user ${atlassianUserId} ${err}`,
				err,
			);
			throw err;
		}
	};

	private mapToDomainModel = (
		dbModel: PrismaOAuthUserCredentials,
	): OAuthUserCredentials => {
		return new OAuthUserCredentials(
			dbModel.id,
			dbModel.atlassianUserId,
			dbModel.accessToken,
			dbModel.refreshToken,
			dbModel.expiresAt,
		);
	};
}

export const oauthUserCredentialsRepository =
	new OAuthUserCredentialsRepository();
