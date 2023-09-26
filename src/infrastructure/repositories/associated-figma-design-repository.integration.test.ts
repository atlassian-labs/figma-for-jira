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
			const [entity1, entity2, entity3] = await Promise.all([
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
				associatedFigmaDesignRepository.upsert(
					generateAssociatedFigmaDesignCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				),
			]);

			const result =
				await associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					entity1.designId,
					entity1.associatedWithAri,
					entity1.connectInstallationId,
				);

			expect(result).toEqual(entity1);
			expect(
				await associatedFigmaDesignRepository.find(entity1.id),
			).toBeFalsy();
			expect(
				await associatedFigmaDesignRepository.find(entity2.id),
			).toBeTruthy();
			expect(
				await associatedFigmaDesignRepository.find(entity3.id),
			).toBeTruthy();
		});

		it('should return null if target entity does not exist', async () => {
			const nonExistingAssociatedFigmaDesign = generateAssociatedFigmaDesign();
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const [associatedFigmaDesign1, associatedFigmaDesign2] =
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
					nonExistingAssociatedFigmaDesign.designId,
					nonExistingAssociatedFigmaDesign.associatedWithAri,
					nonExistingAssociatedFigmaDesign.connectInstallationId,
				);

			expect(result).toBeNull();
			expect(
				await associatedFigmaDesignRepository.find(associatedFigmaDesign1.id),
			).toBeTruthy();
			expect(
				await associatedFigmaDesignRepository.find(associatedFigmaDesign2.id),
			).toBeTruthy();
		});
	});
});
