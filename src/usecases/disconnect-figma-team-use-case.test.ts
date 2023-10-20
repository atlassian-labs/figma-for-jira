import { disconnectFigmaTeamUseCase } from './disconnect-figma-team-use-case';

import {
	generateConnectInstallation,
	generateFigmaTeam,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { ConfigurationState, jiraService } from '../infrastructure/jira';
import { figmaTeamRepository } from '../infrastructure/repositories';

describe('disconnectFigmaTeamUseCase', () => {
	it('should delete the webhook and FigmaTeam and set unconfigured app state', async () => {
		const connectInstallation = generateConnectInstallation();
		const figmaTeam = generateFigmaTeam({
			connectInstallationId: connectInstallation.id,
		});
		jest
			.spyOn(figmaTeamRepository, 'getByTeamIdAndConnectInstallationId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest.spyOn(figmaTeamRepository, 'delete').mockResolvedValue(figmaTeam);
		jest
			.spyOn(figmaTeamRepository, 'findManyByConnectInstallationId')
			.mockResolvedValue([]);
		jest
			.spyOn(jiraService, 'setConfigurationStateInAppProperties')
			.mockResolvedValue(undefined);

		await disconnectFigmaTeamUseCase.execute(
			figmaTeam.teamId,
			connectInstallation,
		);

		expect(
			figmaTeamRepository.getByTeamIdAndConnectInstallationId,
		).toBeCalledWith(figmaTeam.teamId, figmaTeam.connectInstallationId);
		expect(figmaService.tryDeleteWebhook).toBeCalledWith(
			figmaTeam.webhookId,
			figmaTeam.adminInfo,
		);
		expect(figmaTeamRepository.delete).toBeCalledWith(figmaTeam.id);
		expect(figmaTeamRepository.findManyByConnectInstallationId).toBeCalledWith(
			connectInstallation.id,
		);
		expect(jiraService.setConfigurationStateInAppProperties).toBeCalledWith(
			ConfigurationState.UNCONFIGURED,
			connectInstallation,
		);
	});

	it('should delete the webhook and FigmaTeam', async () => {
		const connectInstallation = generateConnectInstallation();
		const figmaTeam = generateFigmaTeam({
			connectInstallationId: connectInstallation.id,
		});
		jest
			.spyOn(figmaTeamRepository, 'getByTeamIdAndConnectInstallationId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest.spyOn(figmaTeamRepository, 'delete').mockResolvedValue(figmaTeam);
		jest
			.spyOn(figmaTeamRepository, 'findManyByConnectInstallationId')
			.mockResolvedValue([
				generateFigmaTeam({
					connectInstallationId: connectInstallation.id,
				}),
			]);

		await disconnectFigmaTeamUseCase.execute(
			figmaTeam.teamId,
			connectInstallation,
		);

		expect(
			figmaTeamRepository.getByTeamIdAndConnectInstallationId,
		).toBeCalledWith(figmaTeam.teamId, figmaTeam.connectInstallationId);
		expect(figmaService.tryDeleteWebhook).toBeCalledWith(
			figmaTeam.webhookId,
			figmaTeam.adminInfo,
		);
		expect(figmaTeamRepository.delete).toBeCalledWith(figmaTeam.id);
		expect(figmaTeamRepository.findManyByConnectInstallationId).toBeCalledWith(
			connectInstallation.id,
		);
		expect(
			jiraService.setConfigurationStateInAppProperties,
		).not.toHaveBeenCalled();
	});
});
