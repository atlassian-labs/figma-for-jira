import { removeFigmaTeamUseCase } from './remove-figma-team-use-case';

import { generateFigmaTeam } from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

describe('removeFigmaTeamUseCase', () => {
	it('should delete the webhook and FigmaTeam', async () => {
		const figmaTeam = generateFigmaTeam();
		jest
			.spyOn(figmaTeamRepository, 'getByTeamIdAndConnectInstallationId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest.spyOn(figmaTeamRepository, 'delete').mockResolvedValue(figmaTeam);

		await removeFigmaTeamUseCase.execute(
			figmaTeam.teamId,
			figmaTeam.connectInstallationId,
		);

		expect(
			figmaTeamRepository.getByTeamIdAndConnectInstallationId,
		).toBeCalledWith(figmaTeam.teamId, figmaTeam.connectInstallationId);
		expect(figmaService.tryDeleteWebhook).toBeCalledWith(figmaTeam.webhookId, {
			atlassianUserId: figmaTeam.figmaAdminAtlassianUserId,
			connectInstallationId: figmaTeam.connectInstallationId,
		});
		expect(figmaTeamRepository.delete).toBeCalledWith(figmaTeam.id);
	});
});
