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

		const result = await prismaClient.get().associatedFigmaDesign.upsert({
			create: dbModel,
			update: dbModel,
			where: {
				fileKey_nodeId_connectInstallationId: {
					fileKey: dbModel.fileKey,
					nodeId: dbModel.nodeId,
					connectInstallationId: dbModel.connectInstallationId,
				},
			},
		});
		return this.mapToDomainModel(result);
	};

	findManyByFileKeyAndConnectInstallationId = async (
		fileKey: string,
		connectInstallationId: number,
	): Promise<AssociatedFigmaDesign[]> => {
		const result = await prismaClient.get().associatedFigmaDesign.findMany({
			where: { fileKey, connectInstallationId },
		});

		return result.map(this.mapToDomainModel);
	};

	deleteByDesignIdAndConnectInstallationId = async (
		designId: FigmaDesignIdentifier,
		connectInstallationId: number,
	): Promise<AssociatedFigmaDesign | undefined> => {
		try {
			const result = await prismaClient.get().associatedFigmaDesign.delete({
				where: {
					fileKey_nodeId_connectInstallationId: {
						fileKey: designId.fileKey,
						nodeId: designId.nodeId ?? '',
						connectInstallationId,
					},
				},
			});

			return this.mapToDomainModel(result);
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				return;
			}
			throw e;
		}
	};

	private mapToDomainModel = ({
		id,
		fileKey,
		nodeId,
		connectInstallationId,
	}: PrismaAssociatedFigmaDesign): AssociatedFigmaDesign => ({
		id,
		designId: new FigmaDesignIdentifier(
			fileKey,
			nodeId !== '' ? nodeId : undefined,
		),
		connectInstallationId,
	});

	private mapToDbModel = ({
		designId,
		connectInstallationId,
	}: AssociatedFigmaDesignCreateParams): PrismaAssociatedFigmaDesignCreateParams => ({
		fileKey: designId.fileKey,
		nodeId: designId.nodeId ?? '',
		connectInstallationId,
	});
}

export const associatedFigmaDesignRepository =
	new AssociatedFigmaDesignRepository();
