import type { FigmaFileWebhook as PrismaFigmaFileWebhook } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { NotFoundRepositoryError } from './errors';
import { prismaClient } from './prisma-client';

import {
	FigmaFileWebhook,
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
		creatorAtlassianUserId,
		connectInstallationId,
	}: FigmaFileWebhookCreateParams): PrismaFigmaFileWebhookCreateParams => ({
		webhookId,
		webhookPasscode,
		fileKey,
		eventType,
		creatorAtlassianUserId,
		connectInstallationId: BigInt(connectInstallationId),
	});

	private mapToFigmaFileWebhook = ({
		id,
		webhookId,
		webhookPasscode,
		fileKey,
		eventType,
		creatorAtlassianUserId,
		connectInstallationId,
	}: PrismaFigmaFileWebhook): FigmaFileWebhook =>
		new FigmaFileWebhook({
			id: id.toString(),
			webhookId,
			webhookPasscode,
			fileKey,
			eventType: FigmaFileWebhookEventType[eventType],
			creatorAtlassianUserId,
			connectInstallationId: connectInstallationId.toString(),
		});
}

export const figmaFileWebhookRepository = new FigmaFileWebhookRepository();
