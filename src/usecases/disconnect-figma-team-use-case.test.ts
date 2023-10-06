import { disconnectFigmaTeamUseCase } from './disconnect-figma-team-use-case';

import { generateFigmaTeam } from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

describe('disconnectFigmaTeamUseCase', () => {
	it('should delete the webhook and FigmaTeam', async () => {
		const figmaTeam = generateFigmaTeam();
		jest
			.spyOn(figmaTeamRepository, 'getByTeamIdAndConnectInstallationId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest.spyOn(figmaTeamRepository, 'delete').mockResolvedValue(figmaTeam);

		await disconnectFigmaTeamUseCase.execute(
			figmaTeam.teamId,
			figmaTeam.connectInstallationId,
		);

		expect(
			figmaTeamRepository.getByTeamIdAndConnectInstallationId,
		).toBeCalledWith(figmaTeam.teamId, figmaTeam.connectInstallationId);
		expect(figmaService.tryDeleteWebhook).toBeCalledWith(
			figmaTeam.webhookId,
			figmaTeam.adminInfo,
		);
		expect(figmaTeamRepository.delete).toBeCalledWith(figmaTeam.id);
	});
});
