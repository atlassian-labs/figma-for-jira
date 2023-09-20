import { v4 as uuidv4 } from 'uuid';

import { handleFigmaFileChangeEventUseCase } from './handle-figma-file-change-event-use-case';

import {
	generateAssociatedFigmaDesign,
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaOAuth2UserCredentials,
	generateFigmaTeam,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

describe('handleFigmaFileChangeEventUseCase', () => {
	describe('error handling', () => {
		const figmaOAuth2Credentials = generateFigmaOAuth2UserCredentials();
		const connectInstallation = generateConnectInstallation();
		const figmaTeam = generateFigmaTeam({
			connectInstallationId: connectInstallation.id,
		});
		const fileKey = uuidv4();
		const associatedFigmaDesigns = [1, 2, 3].map((i) =>
			generateAssociatedFigmaDesign({
				designId: generateFigmaDesignIdentifier({
					fileKey,
					nodeId: `${i}:${i}`,
				}),
				connectInstallationId: connectInstallation.id,
			}),
		);

		it('should rethrow error if getting FigmaTeam fails', async () => {
			const error = new Error('db error');
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockRejectedValue(error);

			await expect(
				handleFigmaFileChangeEventUseCase.execute(
					figmaTeam.webhookId,
					fileKey,
					'FILE_UPDATE',
				),
			).rejects.toStrictEqual(error);
		});

		it('should rethrow error if getting ConnectInstallation fails', async () => {
			const error = new Error('db error');
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockResolvedValue(figmaTeam);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(figmaOAuth2Credentials);
			jest.spyOn(connectInstallationRepository, 'get').mockRejectedValue(error);
			jest
				.spyOn(
					associatedFigmaDesignRepository,
					'findManyByFileKeyAndConnectInstallationId',
				)
				.mockResolvedValue(associatedFigmaDesigns);

			await expect(
				handleFigmaFileChangeEventUseCase.execute(
					figmaTeam.webhookId,
					fileKey,
					'FILE_UPDATE',
				),
			).rejects.toStrictEqual(error);
		});

		it('should rethrow error if getting AssociatedDesigns fails', async () => {
			const error = new Error('db error');
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockResolvedValue(figmaTeam);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(figmaOAuth2Credentials);
			jest
				.spyOn(connectInstallationRepository, 'get')
				.mockResolvedValue(connectInstallation);
			jest
				.spyOn(
					associatedFigmaDesignRepository,
					'findManyByFileKeyAndConnectInstallationId',
				)
				.mockRejectedValue(error);

			await expect(
				handleFigmaFileChangeEventUseCase.execute(
					figmaTeam.webhookId,
					fileKey,
					'FILE_UPDATE',
				),
			).rejects.toStrictEqual(error);
		});

		it('should rethrow error if fetching Figma designs fails', async () => {
			const error = new Error('fetch design error');
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockResolvedValue(figmaTeam);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(figmaOAuth2Credentials);
			jest
				.spyOn(connectInstallationRepository, 'get')
				.mockResolvedValue(connectInstallation);
			jest
				.spyOn(
					associatedFigmaDesignRepository,
					'findManyByFileKeyAndConnectInstallationId',
				)
				.mockResolvedValue(associatedFigmaDesigns);
			jest.spyOn(figmaService, 'fetchDesignById').mockRejectedValue(error);

			await expect(
				handleFigmaFileChangeEventUseCase.execute(
					figmaTeam.webhookId,
					fileKey,
					'FILE_UPDATE',
				),
			).rejects.toStrictEqual(error);
		});

		it('should rethrow error if submitting designs to Jira fails', async () => {
			const error = new Error('submit design error');
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockResolvedValue(figmaTeam);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(figmaOAuth2Credentials);
			jest
				.spyOn(connectInstallationRepository, 'get')
				.mockResolvedValue(connectInstallation);
			jest
				.spyOn(
					associatedFigmaDesignRepository,
					'findManyByFileKeyAndConnectInstallationId',
				)
				.mockResolvedValue(associatedFigmaDesigns);
			jest
				.spyOn(figmaService, 'fetchDesignById')
				.mockImplementation((designId) =>
					Promise.resolve(
						generateAtlassianDesign({ id: designId.toAtlassianDesignId() }),
					),
				);
			jest.spyOn(jiraService, 'updateDesigns').mockRejectedValue(error);

			await expect(
				handleFigmaFileChangeEventUseCase.execute(
					figmaTeam.webhookId,
					fileKey,
					'FILE_UPDATE',
				),
			).rejects.toStrictEqual(error);
		});
	});
});
