import type { FigmaTeam as PrismaFigmaTeam } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { RepositoryRecordNotFoundError } from './errors';
import { prismaClient } from './prisma-client';

import { FigmaTeamAuthStatus } from '../../domain/entities';
import type { FigmaTeam, FigmaTeamCreateParams } from '../../domain/entities';

export class FigmaTeamRepository {
	upsert = async (figmaTeam: FigmaTeamCreateParams): Promise<FigmaTeam> => {
		const result = await prismaClient.get().figmaTeam.upsert({
			create: figmaTeam,
			update: figmaTeam,
			where: {
				teamId_connectInstallationId: {
					teamId: figmaTeam.teamId,
					connectInstallationId: figmaTeam.connectInstallationId,
				},
			},
		});
		return this.mapToDomainModel(result);
	};

	getByWebhookId = async (webhookId: string): Promise<FigmaTeam> => {
		const result = await prismaClient
			.get()
			.figmaTeam.findFirst({ where: { webhookId } });

		if (result === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find FigmaTeam for webhookId ${webhookId}`,
			);
		}

		return this.mapToDomainModel(result);
	};

	updateAuthStatus = async (
		id: number,
		authStatus: FigmaTeamAuthStatus,
	): Promise<void> => {
		try {
			await prismaClient.get().figmaTeam.update({
				data: { authStatus },
				where: { id },
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
		id,
		webhookId,
		webhookPasscode,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus: FigmaTeamAuthStatus[authStatus],
		connectInstallationId,
	});
}

export const figmaTeamRepository = new FigmaTeamRepository();
