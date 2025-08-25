import { v4 as uuidv4 } from 'uuid';

import { handleFigmaFileUpdateEventUseCase } from './handle-figma-file-update-event-use-case';

import * as launchDarkly from '../config/launch_darkly';
import { FigmaTeamAuthStatus } from '../domain/entities';
import {
	generateAssociatedFigmaDesign,
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaFileWebhook,
	generateFigmaTeam,
} from '../domain/entities/testing';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';
import type { FigmaWebhookInfo } from '../web/routes/figma';

describe('handleFigmaFileUpdateEventUseCase', () => {
	describe('file webhook', () => {
		beforeEach(() => {
			jest.spyOn(launchDarkly, 'getLDClient').mockResolvedValue(null);
			jest.spyOn(launchDarkly, 'getFeatureFlag').mockResolvedValue(true);
		});
		it('should handle file webhook events', async () => {
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'get')
				.mockResolvedValue(connectInstallation);

			const figmaFileWebhook = generateFigmaFileWebhook({
				createdBy: {
					connectInstallationId: connectInstallation.id,
					atlassianUserId: uuidv4(),
				},
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
			jest
				.spyOn(
					associatedFigmaDesignRepository,
					'findManyByFileKeyAndConnectInstallationId',
				)
				.mockResolvedValue(associatedFigmaDesigns);
			const associatedAtlassianDesigns = associatedFigmaDesigns.map(
				(figmaDesign) =>
					generateAtlassianDesign({
						id: figmaDesign.designId.toAtlassianDesignId(),
					}),
			);
			jest
				.spyOn(figmaService, 'getAvailableDesignsFromSameFile')
				.mockResolvedValue(associatedAtlassianDesigns);

			jest.spyOn(jiraService, 'submitDesigns').mockResolvedValue();

			const webhookInfo: FigmaWebhookInfo = {
				figmaFileWebhook,
				webhookType: 'file',
			};
			await handleFigmaFileUpdateEventUseCase.execute(webhookInfo, fileKey);
			expect(jiraService.submitDesigns).toHaveBeenCalledWith(
				associatedAtlassianDesigns,
				connectInstallation,
			);
		});
	});
	describe('error handling', () => {
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

		it('should set team status to ERROR and return if fetching Figma team name fails with auth error', async () => {
			jest
				.spyOn(figmaService, 'getTeamName')
				.mockRejectedValue(new UnauthorizedFigmaServiceError());
			jest.spyOn(figmaTeamRepository, 'updateAuthStatus').mockResolvedValue();

			const webhookInfo: FigmaWebhookInfo = {
				figmaTeam,
				webhookType: 'team',
			};
			await handleFigmaFileUpdateEventUseCase.execute(webhookInfo, fileKey);

			expect(figmaTeamRepository.updateAuthStatus).toHaveBeenCalledWith(
				figmaTeam.id,
				FigmaTeamAuthStatus.ERROR,
			);
		});

		it('should continue if fetching Figma team name fails with non-auth error', async () => {
			const associatedAtlassianDesigns = associatedFigmaDesigns.map(
				(figmaDesign) =>
					generateAtlassianDesign({
						id: figmaDesign.designId.toAtlassianDesignId(),
					}),
			);
			jest.spyOn(figmaService, 'getTeamName').mockRejectedValue(new Error());
			jest.spyOn(figmaTeamRepository, 'updateAuthStatus').mockResolvedValue();
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
				.spyOn(figmaService, 'getAvailableDesignsFromSameFile')
				.mockResolvedValue(associatedAtlassianDesigns);
			jest.spyOn(jiraService, 'submitDesigns').mockResolvedValue();

			const webhookInfo: FigmaWebhookInfo = {
				figmaTeam,
				webhookType: 'team',
			};
			await handleFigmaFileUpdateEventUseCase.execute(webhookInfo, fileKey);

			expect(figmaTeamRepository.updateAuthStatus).not.toHaveBeenCalled();
			expect(jiraService.submitDesigns).toHaveBeenCalledWith(
				associatedAtlassianDesigns,
				connectInstallation,
			);
		});

		it('should continue if saving the team name to the database fails', async () => {
			const associatedAtlassianDesigns = associatedFigmaDesigns.map(
				(figmaDesign) =>
					generateAtlassianDesign({
						id: figmaDesign.designId.toAtlassianDesignId(),
					}),
			);
			jest
				.spyOn(figmaService, 'getTeamName')
				.mockResolvedValue(figmaTeam.teamName);
			jest
				.spyOn(figmaTeamRepository, 'updateTeamName')
				.mockRejectedValue(new Error('update team name error'));
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
				.spyOn(figmaService, 'getAvailableDesignsFromSameFile')
				.mockResolvedValue(associatedAtlassianDesigns);
			jest.spyOn(jiraService, 'submitDesigns').mockResolvedValue();

			const webhookInfo: FigmaWebhookInfo = {
				figmaTeam,
				webhookType: 'team',
			};
			await handleFigmaFileUpdateEventUseCase.execute(webhookInfo, fileKey);

			expect(jiraService.submitDesigns).toHaveBeenCalledWith(
				associatedAtlassianDesigns,
				connectInstallation,
			);
		});

		it('should update team auth status and return if fetching Figma designs fails with auth error', async () => {
			jest
				.spyOn(figmaService, 'getTeamName')
				.mockResolvedValue(figmaTeam.teamName);
			jest.spyOn(figmaTeamRepository, 'updateTeamName').mockResolvedValue();
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
				.spyOn(figmaService, 'getAvailableDesignsFromSameFile')
				.mockRejectedValue(new UnauthorizedFigmaServiceError());
			jest.spyOn(figmaTeamRepository, 'updateAuthStatus').mockResolvedValue();

			const webhookInfo: FigmaWebhookInfo = {
				figmaTeam,
				webhookType: 'team',
			};
			await handleFigmaFileUpdateEventUseCase.execute(webhookInfo, fileKey);

			expect(figmaTeamRepository.updateAuthStatus).toHaveBeenCalledWith(
				figmaTeam.id,
				FigmaTeamAuthStatus.ERROR,
			);
		});

		it('should rethrow error if fetching Figma designs fails with non-auth error', async () => {
			const error = new Error('fetch design error');
			jest
				.spyOn(figmaService, 'getTeamName')
				.mockRejectedValue(figmaTeam.teamName);
			jest.spyOn(figmaTeamRepository, 'updateAuthStatus').mockResolvedValue();
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
				.spyOn(figmaService, 'getAvailableDesignsFromSameFile')
				.mockRejectedValue(error);
			jest.spyOn(jiraService, 'submitDesigns');

			const webhookInfo: FigmaWebhookInfo = {
				figmaTeam,
				webhookType: 'team',
			};
			await expect(
				handleFigmaFileUpdateEventUseCase.execute(webhookInfo, fileKey),
			).rejects.toStrictEqual(error);
			expect(jiraService.submitDesigns).not.toHaveBeenCalled();
		});
	});
});
