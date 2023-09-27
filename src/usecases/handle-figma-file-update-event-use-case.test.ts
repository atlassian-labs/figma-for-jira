import { v4 as uuidv4 } from 'uuid';

import { handleFigmaFileUpdateEventUseCase } from './handle-figma-file-update-event-use-case';

import type { AtlassianDesign } from '../domain/entities';
import {
	generateAssociatedFigmaDesign,
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaOAuth2UserCredentials,
	generateFigmaTeam,
} from '../domain/entities/testing';
import { getLogger } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

describe('handleFigmaFileUpdateEventUseCase', () => {
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

		it('should log a warning and continue if saving the team name to the database fails', async () => {
			const associatedAtlassianDesigns: ReadonlyMap<string, AtlassianDesign> =
				new Map(
					associatedFigmaDesigns
						.map((figmaDesign) => figmaDesign.designId.toAtlassianDesignId())
						.map((id) => [id, generateAtlassianDesign({ id })]),
				);
			jest
				.spyOn(figmaService, 'getTeamName')
				.mockResolvedValue(figmaTeam.teamName);
			jest
				.spyOn(figmaTeamRepository, 'updateTeamName')
				.mockRejectedValue(new Error('update team name error'));
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockResolvedValue(figmaTeam);
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
						associatedAtlassianDesigns.get(designId.toAtlassianDesignId())!,
					),
				);
			jest.spyOn(jiraService, 'submitDesigns').mockResolvedValue();

			await handleFigmaFileUpdateEventUseCase.execute(figmaTeam, fileKey);

			expect(getLogger().warn).toBeCalled();
			expect(jiraService.submitDesigns).toBeCalledWith(
				Array.from(associatedAtlassianDesigns.values()).map((design) => ({
					design,
				})),
				connectInstallation,
			);
		});

		it('should rethrow error if getting ConnectInstallation fails', async () => {
			const error = new Error('db error');
			jest
				.spyOn(figmaService, 'getTeamName')
				.mockResolvedValue(figmaTeam.teamName);
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockResolvedValue(figmaTeam);
			jest.spyOn(connectInstallationRepository, 'get').mockRejectedValue(error);
			jest
				.spyOn(
					associatedFigmaDesignRepository,
					'findManyByFileKeyAndConnectInstallationId',
				)
				.mockResolvedValue(associatedFigmaDesigns);
			jest.spyOn(figmaService, 'getValidCredentialsOrThrow');
			jest.spyOn(figmaService, 'fetchDesignById');
			jest.spyOn(jiraService, 'submitDesigns');

			await expect(
				handleFigmaFileUpdateEventUseCase.execute(figmaTeam, fileKey),
			).rejects.toStrictEqual(error);
			expect(figmaService.getValidCredentialsOrThrow).not.toBeCalled();
			expect(figmaService.fetchDesignById).not.toBeCalled();
			expect(jiraService.submitDesigns).not.toBeCalled();
		});

		it('should rethrow error if getting AssociatedDesigns fails', async () => {
			const error = new Error('db error');
			jest
				.spyOn(figmaService, 'getTeamName')
				.mockResolvedValue(figmaTeam.teamName);
			jest
				.spyOn(figmaTeamRepository, 'getByWebhookId')
				.mockResolvedValue(figmaTeam);
			jest
				.spyOn(connectInstallationRepository, 'get')
				.mockResolvedValue(connectInstallation);
			jest
				.spyOn(
					associatedFigmaDesignRepository,
					'findManyByFileKeyAndConnectInstallationId',
				)
				.mockRejectedValue(error);
			jest.spyOn(figmaService, 'getValidCredentialsOrThrow');
			jest.spyOn(figmaService, 'fetchDesignById');
			jest.spyOn(jiraService, 'submitDesigns');

			await expect(
				handleFigmaFileUpdateEventUseCase.execute(figmaTeam, fileKey),
			).rejects.toStrictEqual(error);
			expect(figmaService.getValidCredentialsOrThrow).not.toBeCalled();
			expect(figmaService.fetchDesignById).not.toBeCalled();
			expect(jiraService.submitDesigns).not.toBeCalled();
		});

		it('should rethrow error and not submit designs if fetching any Figma designs fails', async () => {
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
			jest.spyOn(jiraService, 'submitDesigns');

			await expect(
				handleFigmaFileUpdateEventUseCase.execute(figmaTeam, fileKey),
			).rejects.toStrictEqual(error);
			expect(jiraService.submitDesigns).not.toBeCalled();
		});
	});
});
