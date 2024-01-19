import type { AssociatedFigmaDesign as PrismaAssociatedFigmaDesign } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { prismaClient } from './prisma-client';

import type {
	AssociatedFigmaDesign,
	AssociatedFigmaDesignCreateParams,
} from '../../domain/entities';
import {
	AtlassianDesignStatus,
	FigmaDesignIdentifier,
} from '../../domain/entities';

type PrismaAssociatedFigmaDesignCreateParams = Omit<
	PrismaAssociatedFigmaDesign,
	'id'
>;

export class AssociatedFigmaDesignRepository {
	upsert = async (
		createParams: AssociatedFigmaDesignCreateParams,
	): Promise<AssociatedFigmaDesign> => {
		const createParamsDbModel = this.mapCreateParamsToDbModel(createParams);

		const dbModel = await prismaClient.get().associatedFigmaDesign.upsert({
			create: createParamsDbModel,
			update: createParamsDbModel,
			where: {
				fileKey_nodeId_associatedWithAri_connectInstallationId: {
					fileKey: createParamsDbModel.fileKey,
					nodeId: createParamsDbModel.nodeId,
					associatedWithAri: createParamsDbModel.associatedWithAri,
					connectInstallationId: createParamsDbModel.connectInstallationId,
				},
			},
		});
		return this.mapToDomainModel(dbModel);
	};

	/**
	 * @internal
	 * Required for tests only.
	 */
	getAll = async (): Promise<AssociatedFigmaDesign[]> => {
		const dbModels = await prismaClient.get().associatedFigmaDesign.findMany();

		return dbModels.map((dbModel) => this.mapToDomainModel(dbModel));
	};

	findManyByFileKeyAndConnectInstallationId = async (
		fileKey: string,
		connectInstallationId: string,
	): Promise<AssociatedFigmaDesign[]> => {
		const dbModels = await prismaClient.get().associatedFigmaDesign.findMany({
			where: { fileKey, connectInstallationId: BigInt(connectInstallationId) },
		});

		return dbModels.map(this.mapToDomainModel);
	};

	findByDesignIdAndAssociatedWithAriAndConnectInstallationId = async (
		designId: FigmaDesignIdentifier,
		associatedWithAri: string,
		connectInstallationId: string,
	): Promise<AssociatedFigmaDesign | null> => {
		const record = await prismaClient.get().associatedFigmaDesign.findUnique({
			where: {
				fileKey_nodeId_associatedWithAri_connectInstallationId: {
					fileKey: designId.fileKey,
					nodeId: designId.nodeId ?? '',
					associatedWithAri: associatedWithAri,
					connectInstallationId: BigInt(connectInstallationId),
				},
			},
		});

		if (!record) {
			return null;
		}

		return this.mapToDomainModel(record);
	};

	deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId = async (
		designId: FigmaDesignIdentifier,
		associatedWithAri: string,
		connectInstallationId: string,
	): Promise<AssociatedFigmaDesign | null> => {
		try {
			const record = await prismaClient.get().associatedFigmaDesign.delete({
				where: {
					fileKey_nodeId_associatedWithAri_connectInstallationId: {
						fileKey: designId.fileKey,
						nodeId: designId.nodeId ?? '',
						associatedWithAri: associatedWithAri,
						connectInstallationId: BigInt(connectInstallationId),
					},
				},
			});

			return this.mapToDomainModel(record);
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				return null;
			}
			throw e;
		}
	};

	private mapToDomainModel = ({
		id,
		fileKey,
		nodeId,
		associatedWithAri,
		connectInstallationId,
		inputUrl,
		devStatus,
		devStatusLastModified,
	}: PrismaAssociatedFigmaDesign): AssociatedFigmaDesign => ({
		id: id.toString(),
		designId: new FigmaDesignIdentifier(
			fileKey,
			nodeId !== '' ? nodeId : undefined,
		),
		associatedWithAri,
		connectInstallationId: connectInstallationId.toString(),
		inputUrl: inputUrl ?? undefined,
		devStatus:
			(devStatus as AtlassianDesignStatus | undefined) ??
			AtlassianDesignStatus.NONE,
		devStatusLastModified: devStatusLastModified ?? undefined,
	});

	private mapCreateParamsToDbModel = ({
		designId,
		associatedWithAri,
		connectInstallationId,
		inputUrl,
		devStatus,
		devStatusLastModified,
	}: AssociatedFigmaDesignCreateParams): PrismaAssociatedFigmaDesignCreateParams => ({
		fileKey: designId.fileKey,
		nodeId: designId.nodeId ?? '',
		associatedWithAri,
		connectInstallationId: BigInt(connectInstallationId),
		inputUrl: inputUrl ?? null,
		devStatus: devStatus ?? null,
		devStatusLastModified: devStatusLastModified ?? null,
	});
}

export const associatedFigmaDesignRepository =
	new AssociatedFigmaDesignRepository();
