import type { FigmaOAuth2UserCredentials as PrismaFigmaOAuth2UserCredentials } from '@prisma/client';

import { logger } from '..';
import {
	FigmaOAuth2UserCredentials,
	FigmaUserCredentialsCreateParams,
} from '../../domain/entities';
import { getPrismaClient } from './prisma-client';

export class FigmaOAuthUserCredentialsRepository {
	find = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials | null> => {
		try {
			const credentials =
				await getPrismaClient().figmaOAuth2UserCredentials.findFirst({
					where: { atlassianUserId },
				});

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
		credentials: FigmaUserCredentialsCreateParams,
	): Promise<FigmaOAuth2UserCredentials> => {
		try {
			const params: Omit<PrismaFigmaOAuth2UserCredentials, 'id'> = credentials;
			const result = await getPrismaClient().figmaOAuth2UserCredentials.upsert({
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

	delete = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		try {
			const result = await getPrismaClient().figmaOAuth2UserCredentials.delete({
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
		dbModel: PrismaFigmaOAuth2UserCredentials,
	): FigmaOAuth2UserCredentials => {
		return new FigmaOAuth2UserCredentials(
			dbModel.id,
			dbModel.atlassianUserId,
			dbModel.accessToken,
			dbModel.refreshToken,
			dbModel.expiresAt,
		);
	};
}

export const figmaOAuthUserCredentialsRepository =
	new FigmaOAuthUserCredentialsRepository();
