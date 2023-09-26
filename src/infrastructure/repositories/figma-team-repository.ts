import type { FigmaTeam as PrismaFigmaTeam } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { RepositoryRecordNotFoundError } from './errors';
import { prismaClient } from './prisma-client';

import type { FigmaTeam, FigmaTeamCreateParams } from '../../domain/entities';
import { FigmaTeamAuthStatus } from '../../domain/entities';

type PrismaFigmaTeamCreateParams = Omit<PrismaFigmaTeam, 'id'>;

export class FigmaTeamRepository {
	upsert = async (createParams: FigmaTeamCreateParams): Promise<FigmaTeam> => {
		const createParamsDbModel = this.mapCreateParamsToDbModel(createParams);

		const dbModel = await prismaClient.get().figmaTeam.upsert({
			create: createParamsDbModel,
			update: createParamsDbModel,
			where: {
				teamId_connectInstallationId: {
					teamId: createParamsDbModel.teamId,
					connectInstallationId: createParamsDbModel.connectInstallationId,
				},
			},
		});
		return this.mapToDomainModel(dbModel);
	};

	getByWebhookId = async (webhookId: string): Promise<FigmaTeam> => {
		const dbModel = await prismaClient
			.get()
			.figmaTeam.findFirst({ where: { webhookId } });

		if (dbModel === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find FigmaTeam for webhookId ${webhookId}`,
			);
		}

		return this.mapToDomainModel(dbModel);
	};

	updateAuthStatus = async (
		id: string,
		authStatus: FigmaTeamAuthStatus,
	): Promise<void> => {
		try {
			await prismaClient.get().figmaTeam.update({
				data: { authStatus },
				where: { id: BigInt(id) },
			});
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				throw new RepositoryRecordNotFoundError(e.message);
			}
		}
	};

	private mapCreateParamsToDbModel = ({
		webhookId,
		webhookPasscode,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus,
		connectInstallationId,
	}: FigmaTeamCreateParams): PrismaFigmaTeamCreateParams => ({
		webhookId,
		webhookPasscode,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus,
		connectInstallationId: BigInt(connectInstallationId),
	});

	private mapToDomainModel = ({
		id,
		webhookId,
		webhookPasscode,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus,
		connectInstallationId,
	}: PrismaFigmaTeam): FigmaTeam => ({
		id: id.toString(),
		webhookId,
		webhookPasscode,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus: FigmaTeamAuthStatus[authStatus],
		connectInstallationId: connectInstallationId.toString(),
	});
}

export const figmaTeamRepository = new FigmaTeamRepository();
