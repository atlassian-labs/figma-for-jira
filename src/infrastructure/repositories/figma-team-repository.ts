import type { FigmaTeam as PrismaFigmaTeam } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

	updateStatus = async (
		id: number,
		status: FigmaTeamAuthStatus,
	): Promise<void> => {
		try {
			await prismaClient.get().figmaTeam.update({
				data: { status },
				where: { id },
			});
		} catch (e: unknown) {
			if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
				throw new RepositoryRecordNotFoundError(e.message);
			}
		}
	};

	private mapToDomainModel = ({
		id,
		webhookId,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		status,
		connectInstallationId,
	}: PrismaFigmaTeam) => ({
		id,
		webhookId,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		status: FigmaTeamAuthStatus[status],
		connectInstallationId,
	});
}

export const figmaTeamRepository = new FigmaTeamRepository();
