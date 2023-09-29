import { associatedFigmaDesignRepository } from './associated-figma-design-repository';
import { connectInstallationRepository } from './connect-installation-repository';

import {
	generateAssociatedFigmaDesign,
	generateAssociatedFigmaDesignCreateParams,
	generateConnectInstallationCreateParams,
} from '../../domain/entities/testing';

describe('AssociatedFigmaDesignRepository', () => {
	describe('deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId', () => {
		it('should delete target entity', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const [targetAssociatedFigmaDesign, otherAssociatedFigmaDesign] =
				await Promise.all([
					associatedFigmaDesignRepository.upsert(
						generateAssociatedFigmaDesignCreateParams({
							connectInstallationId: connectInstallation.id,
						}),
					),
					associatedFigmaDesignRepository.upsert(
						generateAssociatedFigmaDesignCreateParams({
							connectInstallationId: connectInstallation.id,
						}),
					),
				]);

			const result =
				await associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					targetAssociatedFigmaDesign.designId,
					targetAssociatedFigmaDesign.associatedWithAri,
					targetAssociatedFigmaDesign.connectInstallationId,
				);

			expect(result).toEqual(targetAssociatedFigmaDesign);
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([
				otherAssociatedFigmaDesign,
			]);
		});

		it('should return null if target entity does not exist', async () => {
			const nonExistingAssociatedFigmaDesign = generateAssociatedFigmaDesign();
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const associatedFigmaDesign =
				await associatedFigmaDesignRepository.upsert(
					generateAssociatedFigmaDesignCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);

			const result =
				await associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					nonExistingAssociatedFigmaDesign.designId,
					nonExistingAssociatedFigmaDesign.associatedWithAri,
					nonExistingAssociatedFigmaDesign.connectInstallationId,
				);

			expect(result).toBeNull();
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([
				associatedFigmaDesign,
			]);
		});
	});
});
