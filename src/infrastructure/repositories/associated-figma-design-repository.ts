import type { AssociatedFigmaDesign as PrismaAssociatedFigmaDesign } from '@prisma/client';

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
