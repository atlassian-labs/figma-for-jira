import type { FigmaTeam as PrismaFigmaTeam } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { NotFoundRepositoryError } from './errors';
import { prismaClient } from './prisma-client';

import type {
	FigmaTeamCreateParams,
	FigmaTeamSummary,
} from '../../domain/entities';
import { FigmaTeam, FigmaTeamAuthStatus } from '../../domain/entities';

type PrismaFigmaTeamCreateParams = Omit<PrismaFigmaTeam, 'id'>;
type PrismaFigmaTeamSummary = Pick<
	PrismaFigmaTeam,
	'teamId' | 'teamName' | 'authStatus'
>;

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
		return this.mapToFigmaTeam(dbModel);
	};

	/**
	 * @internal
	 * Required for tests only.
	 */
	getAll = async (): Promise<FigmaTeam[]> => {
		const dbModels = await prismaClient.get().figmaTeam.findMany();

		return dbModels.map((dbModel) => this.mapToFigmaTeam(dbModel));
	};

	getByTeamIdAndConnectInstallationId = async (
		teamId: string,
		connectInstallationId: string,
	): Promise<FigmaTeam> => {
		const dbModel = await prismaClient.get().figmaTeam.findFirst({
			where: { teamId, connectInstallationId: BigInt(connectInstallationId) },
		});

		if (dbModel === null) {
			throw new NotFoundRepositoryError(
				`Failed to find FigmaTeam for teamId ${teamId} and connectInstallationId ${connectInstallationId}`,
			);
		}

		return this.mapToFigmaTeam(dbModel);
	};

	findByWebhookId = async (webhookId: string): Promise<FigmaTeam | null> => {
		const dbModel = await prismaClient
			.get()
			.figmaTeam.findFirst({ where: { webhookId } });

		if (dbModel === null) return null;

		return this.mapToFigmaTeam(dbModel);
	};

	findManyByConnectInstallationId = async (
		connectInstallationId: string,
	): Promise<FigmaTeam[]> => {
		const dbModel = await prismaClient.get().figmaTeam.findMany({
			where: { connectInstallationId: BigInt(connectInstallationId) },
		});

		return dbModel.map((record) => this.mapToFigmaTeam(record));
	};

	findManySummaryByConnectInstallationId = async (
		connectInstallationId: string,
	): Promise<FigmaTeamSummary[]> => {
		const dbModel = await prismaClient.get().figmaTeam.findMany({
			where: { connectInstallationId: BigInt(connectInstallationId) },
			select: { teamId: true, teamName: true, authStatus: true },
		});

		return dbModel.map((record) => this.mapToFigmaTeamSummary(record));
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
				throw new NotFoundRepositoryError(e.message);
			}
		}
	};

	updateTeamName = async (id: string, teamName: string): Promise<void> => {
		try {
			await prismaClient.get().figmaTeam.update({
				data: { teamName },
				where: { id: BigInt(id) },
			});
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				throw new NotFoundRepositoryError('Figma team is not found.', e);
			}
		}
	};

	delete = async (id: string): Promise<FigmaTeam> => {
		try {
			const dbModel = await prismaClient.get().figmaTeam.delete({
				where: { id: BigInt(id) },
			});
			return this.mapToFigmaTeam(dbModel);
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				throw new NotFoundRepositoryError('Figma team is not found.', e);
			}
			throw e;
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

	private mapToFigmaTeam = ({
		id,
		webhookId,
		webhookPasscode,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus,
		connectInstallationId,
	}: PrismaFigmaTeam): FigmaTeam =>
		new FigmaTeam({
			id: id.toString(),
			webhookId,
			webhookPasscode,
			teamId,
			teamName,
			figmaAdminAtlassianUserId,
			authStatus: FigmaTeamAuthStatus[authStatus],
			connectInstallationId: connectInstallationId.toString(),
		});

	private mapToFigmaTeamSummary = ({
		teamId,
		teamName,
		authStatus,
	}: PrismaFigmaTeamSummary): FigmaTeamSummary => ({
		teamId,
		teamName,
		authStatus: FigmaTeamAuthStatus[authStatus],
	});
}

export const figmaTeamRepository = new FigmaTeamRepository();
