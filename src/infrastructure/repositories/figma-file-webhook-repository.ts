import type { FigmaFileWebhook as PrismaFigmaFileWebhook } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { NotFoundRepositoryError } from './errors';
import { prismaClient } from './prisma-client';

import {
	type FigmaFileWebhook,
	type FigmaFileWebhookCreateParams,
	FigmaFileWebhookEventType,
} from '../../domain/entities';

type PrismaFigmaFileWebhookCreateParams = Omit<PrismaFigmaFileWebhook, 'id'>;

export class FigmaFileWebhookRepository {
	upsert = async (
		createParams: FigmaFileWebhookCreateParams,
	): Promise<FigmaFileWebhook> => {
		const createParamsDbModel = this.mapCreateParamsToDbModel(createParams);

		const dbModel = await prismaClient.get().figmaFileWebhook.upsert({
			create: createParamsDbModel,
			update: createParamsDbModel,
			where: {
				fileKey_eventType_connectInstallationId: {
					fileKey: createParamsDbModel.fileKey,
					eventType: createParamsDbModel.eventType,
					connectInstallationId: createParamsDbModel.connectInstallationId,
				},
			},
		});
		return this.mapToFigmaFileWebhook(dbModel);
	};

	/**
	 * @internal
	 * Required for tests only.
	 */
	getAll = async (): Promise<FigmaFileWebhook[]> => {
		const dbModels = await prismaClient.get().figmaFileWebhook.findMany();

		return dbModels.map((dbModel) => this.mapToFigmaFileWebhook(dbModel));
	};

	findByFileKeyAndEventTypeAndConnectInstallationId = async (
		fileKey: string,
		eventType: FigmaFileWebhookEventType,
		connectInstallationId: string,
	): Promise<FigmaFileWebhook | null> => {
		const dbModel = await prismaClient.get().figmaFileWebhook.findFirst({
			where: {
				fileKey,
				eventType,
				connectInstallationId: BigInt(connectInstallationId),
			},
		});

		return dbModel ? this.mapToFigmaFileWebhook(dbModel) : null;
	};

	findManyByFileKeyAndConnectInstallationId = async (
		fileKey: string,
		connectInstallationId: string,
	): Promise<FigmaFileWebhook[]> => {
		const dbModel = await prismaClient.get().figmaFileWebhook.findMany({
			where: { fileKey, connectInstallationId: BigInt(connectInstallationId) },
		});

		return dbModel.map((record) => this.mapToFigmaFileWebhook(record));
	};

	findByWebhookId = async (
		webhookId: string,
	): Promise<FigmaFileWebhook | null> => {
		const dbModel = await prismaClient
			.get()
			.figmaFileWebhook.findFirst({ where: { webhookId } });

		if (dbModel === null) return null;

		return this.mapToFigmaFileWebhook(dbModel);
	};

	findManyByConnectInstallationId = async (
		connectInstallationId: string,
	): Promise<FigmaFileWebhook[]> => {
		const dbModel = await prismaClient.get().figmaFileWebhook.findMany({
			where: { connectInstallationId: BigInt(connectInstallationId) },
		});

		return dbModel.map((record) => this.mapToFigmaFileWebhook(record));
	};

	delete = async (id: string): Promise<FigmaFileWebhook> => {
		try {
			const dbModel = await prismaClient.get().figmaFileWebhook.delete({
				where: { id: BigInt(id) },
			});
			return this.mapToFigmaFileWebhook(dbModel);
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				throw new NotFoundRepositoryError(
					'Figma file webhook is not found.',
					e,
				);
			}
			throw e;
		}
	};

	private mapCreateParamsToDbModel = ({
		webhookId,
		webhookPasscode,
		fileKey,
		eventType,
		createdBy,
	}: FigmaFileWebhookCreateParams): PrismaFigmaFileWebhookCreateParams => ({
		webhookId,
		webhookPasscode,
		fileKey,
		eventType,
		creatorAtlassianUserId: createdBy.atlassianUserId,
		connectInstallationId: BigInt(createdBy.connectInstallationId),
	});

	private mapToFigmaFileWebhook = ({
		id,
		webhookId,
		webhookPasscode,
		fileKey,
		eventType,
		creatorAtlassianUserId,
		connectInstallationId,
	}: PrismaFigmaFileWebhook): FigmaFileWebhook => {
		return {
			id: id.toString(),
			webhookId,
			webhookPasscode,
			fileKey,
			eventType: FigmaFileWebhookEventType[eventType],
			createdBy: {
				atlassianUserId: creatorAtlassianUserId,
				connectInstallationId: connectInstallationId.toString(),
			},
		};
	};
}

export const figmaFileWebhookRepository = new FigmaFileWebhookRepository();
