import { PrismaClient } from '@prisma/client';

import type { OAuthUserCredentials } from '../../domain/entities/oauth-user-credentials';
import { OAuthUserCredentialsRepository } from '../../domain/repositories/oauth-user-credentials-repository';
import logger from '../logger';

export class OAuthUserCredentialsRepositoryImpl
	implements OAuthUserCredentialsRepository
{
	prisma: PrismaClient;

	constructor(prismaClient: PrismaClient) {
		this.prisma = prismaClient;
	}

	getOAuthToken = async (atlassianUserId: string): Promise<string | null> => {
		try {
			const credentials = await this.prisma.oAuthUserCredential.findFirst({
				where: { atlassianUserId },
			});
			return credentials?.accessToken ?? null;
		} catch (err) {
			logger.error(
				`Failed to retrieve credentials for atlassianUserId: ${atlassianUserId} ${err}`,
				err,
			);
			throw err;
		}
	};

	upsertOAuthUserCredentials = async (
		credentials: OAuthUserCredentials,
	): Promise<OAuthUserCredentials> => {
		try {
			return await this.prisma.oAuthUserCredential.upsert({
				create: credentials,
				update: credentials,
				where: { atlassianUserId: credentials.atlassianUserId },
			});
		} catch (err) {
			logger.error(
				`Failed to upsert credentials for user ${credentials.atlassianUserId} ${err}`,
				err,
			);
			throw err;
		}
	};

	deleteOAuthUserCredentials = async (
		atlassianUserId: string,
	): Promise<OAuthUserCredentials> => {
		try {
			return await this.prisma.oAuthUserCredential.delete({
				where: { atlassianUserId },
			});
		} catch (err) {
			logger.error(
				`Failed to delete credentials for user ${atlassianUserId} ${err}`,
				err,
			);
			throw err;
		}
	};
}
