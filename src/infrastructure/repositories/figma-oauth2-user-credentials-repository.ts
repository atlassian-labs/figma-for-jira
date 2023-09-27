import type { FigmaOAuth2UserCredentials as PrismaFigmaOAuth2UserCredentials } from '@prisma/client';

import { RepositoryRecordNotFoundError } from './errors';
import { prismaClient } from './prisma-client';

import type { FigmaOAuth2UserCredentialsCreateParams } from '../../domain/entities';
import { FigmaOAuth2UserCredentials } from '../../domain/entities';

type PrismaFigmaOAuth2UserCredentialsCreateParams = Omit<
	PrismaFigmaOAuth2UserCredentials,
	'id'
>;

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
		createParams: FigmaOAuth2UserCredentialsCreateParams,
	): Promise<FigmaOAuth2UserCredentials> => {
		const createParamsDbModel = this.mapCreateParamsToDbModel(createParams);

		const dbModel = await prismaClient.get().figmaOAuth2UserCredentials.upsert({
			create: createParamsDbModel,
			update: createParamsDbModel,
			where: { atlassianUserId: createParamsDbModel.atlassianUserId },
		});
		return this.mapToDomainModel(dbModel);
	};

	delete = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		const dbModel = await prismaClient.get().figmaOAuth2UserCredentials.delete({
			where: { atlassianUserId },
		});
		return this.mapToDomainModel(dbModel);
	};

	private mapCreateParamsToDbModel = ({
		atlassianUserId,
		accessToken,
		refreshToken,
		expiresAt,
	}: FigmaOAuth2UserCredentialsCreateParams): PrismaFigmaOAuth2UserCredentialsCreateParams => ({
		atlassianUserId,
		accessToken,
		refreshToken,
		expiresAt,
	});

	private mapToDomainModel = (
		dbModel: PrismaFigmaOAuth2UserCredentials,
	): FigmaOAuth2UserCredentials => {
		return new FigmaOAuth2UserCredentials(
			dbModel.id.toString(),
			dbModel.atlassianUserId,
			dbModel.accessToken,
			dbModel.refreshToken,
			dbModel.expiresAt,
		);
	};
}

export const figmaOAuth2UserCredentialsRepository =
	new FigmaOAuth2UserCredentialsRepository();
