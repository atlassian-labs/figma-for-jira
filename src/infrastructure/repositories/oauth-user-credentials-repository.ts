import { PrismaClient } from '@prisma/client';

import type { OAuthUserCredentials } from 'src/domain/entities/oauth-user-credentials';
import { OAuthUserCredentialsRepository } from 'src/domain/repositories/oauth-user-credentials-repository';

import logger from '../logger';

export class OAuthUserCredentialsRepositoryImpl
	implements OAuthUserCredentialsRepository
{
	prisma: PrismaClient;

	constructor(prismaClient: PrismaClient) {
		this.prisma = prismaClient;
	}

	getOAuthToken = async (userId: string): Promise<string | null> => {
		try {
			const credentials = await this.prisma.oAuthUserCredential.findFirst({
				where: { userId },
			});
			return credentials?.accessToken ?? null;
		} catch (err) {
			logger.error(
				`Failed to retrieve credentials for userId: ${userId} ${err}`,
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
				where: { userId: credentials.userId },
			});
		} catch (err) {
			logger.error(
				`Failed to upsert credentials for user ${credentials.userId} ${err}`,
				err,
			);
			throw err;
		}
	};

	deleteOAuthUserCredentials = async (
		userId: string,
	): Promise<OAuthUserCredentials> => {
		try {
			return await this.prisma.oAuthUserCredential.delete({
				where: { userId },
			});
		} catch (err) {
			logger.error(
				`Failed to delete credentials for user ${userId} ${err}`,
				err,
			);
			throw err;
		}
	};
}
