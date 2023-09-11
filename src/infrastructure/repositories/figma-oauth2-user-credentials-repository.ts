import type { FigmaOAuth2UserCredentials as PrismaFigmaOAuth2UserCredentials } from '@prisma/client';

import { RepositoryRecordNotFoundError } from './errors';
import { prismaClient } from './prisma-client';

import type { FigmaUserCredentialsCreateParams } from '../../domain/entities';
import { FigmaOAuth2UserCredentials } from '../../domain/entities';

export class FigmaOAuth2UserCredentialsRepository {
	get = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		const credentials = await prismaClient
			.get()
			.figmaOAuth2UserCredentials.findFirst({
				where: { atlassianUserId },
			});
		if (credentials === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find FigmaOAuth2UserCredentials with atlassianUserId ${atlassianUserId}`,
			);
		}

		return this.mapToDomainModel(credentials);
	};

	upsert = async (
		credentials: FigmaUserCredentialsCreateParams,
	): Promise<FigmaOAuth2UserCredentials> => {
		const params: Omit<PrismaFigmaOAuth2UserCredentials, 'id'> = credentials;
		const result = await prismaClient.get().figmaOAuth2UserCredentials.upsert({
			create: params,
			update: params,
			where: { atlassianUserId: credentials.atlassianUserId },
		});
		return this.mapToDomainModel(result);
	};

	delete = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		const result = await prismaClient.get().figmaOAuth2UserCredentials.delete({
			where: { atlassianUserId },
		});
		return this.mapToDomainModel(result);
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
