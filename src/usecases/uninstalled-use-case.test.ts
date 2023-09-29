import { uninstalledUseCase } from './uninstalled-use-case';

import {
	generateConnectInstallation,
	generateFigmaTeam,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import {
	connectInstallationRepository,
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
		jest
			.spyOn(connectInstallationRepository, 'getByClientKey')
			.mockResolvedValue(connectInstallation);
		jest
			.spyOn(figmaTeamRepository, 'findManyByConnectInstallationId')
			.mockResolvedValue([figmaTeam1, figmaTeam2]);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest
			.spyOn(connectInstallationRepository, 'deleteByClientKey')
			.mockResolvedValue(connectInstallation);

		await uninstalledUseCase.execute(connectInstallation.clientKey);

		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledTimes(2);
		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			figmaTeam1.webhookId,
			{
				atlassianUserId: figmaTeam1.figmaAdminAtlassianUserId,
				connectInstallationId: connectInstallation.id,
			},
		);
		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			figmaTeam2.webhookId,
			{
				atlassianUserId: figmaTeam2.figmaAdminAtlassianUserId,
				connectInstallationId: connectInstallation.id,
			},
		);
		expect(
			connectInstallationRepository.deleteByClientKey,
		).toHaveBeenCalledWith(connectInstallation.clientKey);
	});
});
