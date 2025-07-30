import { uninstalledUseCase } from './uninstalled-use-case';

import {
	generateConnectInstallation,
	generateFigmaFileWebhook,
	generateFigmaTeam,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	connectInstallationRepository,
	figmaFileWebhookRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

describe('uninstalledUseCase', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should delete Figma webhook and app data', async () => {
		const connectInstallation = generateConnectInstallation();
		const [figmaTeam1, figmaTeam2] = [
			generateFigmaTeam({ connectInstallationId: connectInstallation.id }),
			generateFigmaTeam({ connectInstallationId: connectInstallation.id }),
		];
		const [figmaFileWebhook1, figmaFileWebhook2] = [
			generateFigmaFileWebhook({
				connectInstallationId: connectInstallation.id,
			}),
			generateFigmaFileWebhook({
				connectInstallationId: connectInstallation.id,
			}),
		];
		jest
			.spyOn(connectInstallationRepository, 'getByClientKey')
			.mockResolvedValue(connectInstallation);
		jest
			.spyOn(figmaTeamRepository, 'findManyByConnectInstallationId')
			.mockResolvedValue([figmaTeam1, figmaTeam2]);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest
			.spyOn(figmaFileWebhookRepository, 'findManyByConnectInstallationId')
			.mockResolvedValue([figmaFileWebhook1, figmaFileWebhook2]);
		jest
			.spyOn(connectInstallationRepository, 'deleteByClientKey')
			.mockResolvedValue(connectInstallation);
		jest
			.spyOn(jiraService, 'deleteAppConfigurationState')
			.mockResolvedValue(undefined);

		await uninstalledUseCase.execute(connectInstallation.clientKey);

		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledTimes(4);
		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			figmaTeam1.webhookId,
			figmaTeam1.adminInfo,
		);
		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			figmaTeam2.webhookId,
			figmaTeam2.adminInfo,
		);
		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			figmaFileWebhook1.webhookId,
			figmaFileWebhook1.creatorInfo,
		);
		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			figmaFileWebhook2.webhookId,
			figmaFileWebhook2.creatorInfo,
		);
		expect(
			connectInstallationRepository.deleteByClientKey,
		).toHaveBeenCalledWith(connectInstallation.clientKey);
		expect(jiraService.deleteAppConfigurationState).toHaveBeenCalledWith(
			connectInstallation,
		);
	});
});
