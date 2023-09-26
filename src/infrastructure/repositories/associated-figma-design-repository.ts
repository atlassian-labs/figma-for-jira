import type { AssociatedFigmaDesign as PrismaAssociatedFigmaDesign } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { prismaClient } from './prisma-client';

import type {
	AssociatedFigmaDesign,
	AssociatedFigmaDesignCreateParams,
} from '../../domain/entities';
import { FigmaDesignIdentifier } from '../../domain/entities';

type PrismaAssociatedFigmaDesignCreateParams = Omit<
	PrismaAssociatedFigmaDesign,
	'id'
>;

export class AssociatedFigmaDesignRepository {
	upsert = async (
		associatedFigmaDesign: AssociatedFigmaDesignCreateParams,
	): Promise<AssociatedFigmaDesign> => {
		const dbModel = this.mapToDbModel(associatedFigmaDesign);

		const record = await prismaClient.get().associatedFigmaDesign.upsert({
			create: dbModel,
			update: dbModel,
			where: {
				fileKey_nodeId_associatedWithAri_connectInstallationId: {
					fileKey: dbModel.fileKey,
					nodeId: dbModel.nodeId,
					associatedWithAri: dbModel.associatedWithAri,
					connectInstallationId: dbModel.connectInstallationId,
				},
			},
		});
		return this.mapToDomainModel(record);
	};

	/**
	 * @remarks
	 * Required for tests only.
	 */
	find = async (id: bigint): Promise<AssociatedFigmaDesign | null> => {
		const record = await prismaClient.get().associatedFigmaDesign.findFirst({
			where: {
				id,
			},
		});

		if (record === null) return null;

		return this.mapToDomainModel(record);
	};

	findManyByFileKeyAndConnectInstallationId = async (
		fileKey: string,
		connectInstallationId: bigint,
	): Promise<AssociatedFigmaDesign[]> => {
		const records = await prismaClient.get().associatedFigmaDesign.findMany({
			where: { fileKey, connectInstallationId },
		});

		return records.map(this.mapToDomainModel);
	};

	/**
	 * @remarks
	 * Required for integration tests only.
	 */
	findByDesignIdAndAssociatedWithAriAndConnectInstallationId = async (
		designId: FigmaDesignIdentifier,
		associatedWithAri: string,
		connectInstallationId: bigint,
	): Promise<AssociatedFigmaDesign | null> => {
		const record = await prismaClient.get().associatedFigmaDesign.findFirst({
			where: {
				fileKey: designId.fileKey,
				nodeId: designId.nodeId ?? '',
				associatedWithAri: associatedWithAri,
				connectInstallationId,
			},
		});

		if (record === null) return null;

		return this.mapToDomainModel(record);
	};

	deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId = async (
		designId: FigmaDesignIdentifier,
		associatedWithAri: string,
		connectInstallationId: bigint,
	): Promise<AssociatedFigmaDesign | null> => {
		try {
			const record = await prismaClient.get().associatedFigmaDesign.delete({
				where: {
					fileKey_nodeId_associatedWithAri_connectInstallationId: {
						fileKey: designId.fileKey,
						nodeId: designId.nodeId ?? '',
						associatedWithAri: associatedWithAri,
						connectInstallationId,
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
	}: PrismaAssociatedFigmaDesign): AssociatedFigmaDesign => ({
		id,
		designId: new FigmaDesignIdentifier(
			fileKey,
			nodeId !== '' ? nodeId : undefined,
		),
		associatedWithAri,
		connectInstallationId,
	});

	private mapToDbModel = ({
		designId,
		associatedWithAri,
		connectInstallationId,
	}: AssociatedFigmaDesignCreateParams): PrismaAssociatedFigmaDesignCreateParams => ({
		fileKey: designId.fileKey,
		nodeId: designId.nodeId ?? '',
		associatedWithAri,
		connectInstallationId,
	});
}

export const associatedFigmaDesignRepository =
	new AssociatedFigmaDesignRepository();
