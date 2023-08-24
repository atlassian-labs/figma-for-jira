import type { FigmaOAuth2UserCredentials as PrismaFigmaOAuth2UserCredentials } from '@prisma/client';

import { getPrismaClient } from './prisma-client';

import { logger } from '..';
import {
	FigmaOAuth2UserCredentials,
	FigmaUserCredentialsCreateParams,
} from '../../domain/entities';

export class FigmaOAuth2UserCredentialsRepository {
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
				err,
				'Failed to retrieve credentials for atlassianUserId: %s',
				atlassianUserId,
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
				err,
				'Failed to upsert credentials for user %s',
				credentials.atlassianUserId,
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
				err,
				'Failed to delete credentials for user %s',
				atlassianUserId,
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

export const figmaOAuth2UserCredentialsRepository =
	new FigmaOAuth2UserCredentialsRepository();
