import type { FigmaTeam as PrismaFigmaTeam } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { RepositoryRecordNotFoundError } from './errors';
import { prismaClient } from './prisma-client';

import type { FigmaTeam, FigmaTeamCreateParams } from '../../domain/entities';
import { FigmaTeamAuthStatus } from '../../domain/entities';

export class FigmaTeamRepository {
	upsert = async (figmaTeam: FigmaTeamCreateParams): Promise<FigmaTeam> => {
		const record = await prismaClient.get().figmaTeam.upsert({
			create: figmaTeam,
			update: figmaTeam,
			where: {
				teamId_connectInstallationId: {
					teamId: figmaTeam.teamId,
					connectInstallationId: figmaTeam.connectInstallationId,
				},
			},
		});
		return this.mapToDomainModel(record);
	};

	getByWebhookId = async (webhookId: string): Promise<FigmaTeam> => {
		const record = await prismaClient
			.get()
			.figmaTeam.findFirst({ where: { webhookId } });

		if (record === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find FigmaTeam for webhookId ${webhookId}`,
			);
		}

		return this.mapToDomainModel(record);
	};

	findManyByConnectInstallationId = async (
		connectInstallationId: number,
	): Promise<FigmaTeam[]> => {
		const records = await prismaClient
			.get()
			.figmaTeam.findMany({ where: { connectInstallationId } });

		return records.map((record) => this.mapToDomainModel(record));
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
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus,
		connectInstallationId,
	}: PrismaFigmaTeam): FigmaTeam => ({
		id,
		webhookId,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus: FigmaTeamAuthStatus[authStatus],
		connectInstallationId,
	});
}

export const figmaTeamRepository = new FigmaTeamRepository();
