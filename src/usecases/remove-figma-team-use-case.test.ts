import { removeFigmaTeamUseCase } from './remove-figma-team-use-case';

import { generateFigmaTeam } from '../domain/entities/testing';
import { getLogger } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

describe('removeFigmaTeamUseCase', () => {
	it('should delete the webhook and FigmaTeam', async () => {
		const figmaTeam = generateFigmaTeam();
		jest
			.spyOn(figmaTeamRepository, 'getByTeamIdAndConnectInstallationId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'deleteWebhook').mockResolvedValue();
		jest.spyOn(figmaTeamRepository, 'delete').mockResolvedValue(figmaTeam);

		await removeFigmaTeamUseCase.execute(
			figmaTeam.teamId,
			figmaTeam.connectInstallationId,
		);

		expect(
			figmaTeamRepository.getByTeamIdAndConnectInstallationId,
		).toBeCalledWith(figmaTeam.teamId, figmaTeam.connectInstallationId);
		expect(figmaService.deleteWebhook).toBeCalledWith(
			figmaTeam.webhookId,
			figmaTeam.figmaAdminAtlassianUserId,
		);
		expect(figmaTeamRepository.delete).toBeCalledWith(figmaTeam.id);
	});

	it('should delete the FigmaTeam and log a warning if deleting the webhook fails', async () => {
		const figmaTeam = generateFigmaTeam();
		const deleteWebhookError = new Error('delete webhook error');
		jest
			.spyOn(figmaTeamRepository, 'getByTeamIdAndConnectInstallationId')
			.mockResolvedValue(figmaTeam);
		jest
			.spyOn(figmaService, 'deleteWebhook')
			.mockRejectedValue(deleteWebhookError);
		jest.spyOn(figmaTeamRepository, 'delete').mockResolvedValue(figmaTeam);

		await removeFigmaTeamUseCase.execute(
			figmaTeam.teamId,
			figmaTeam.connectInstallationId,
		);

		expect(
			figmaTeamRepository.getByTeamIdAndConnectInstallationId,
		).toBeCalledWith(figmaTeam.teamId, figmaTeam.connectInstallationId);
		expect(figmaService.deleteWebhook).toBeCalledWith(
			figmaTeam.webhookId,
			figmaTeam.figmaAdminAtlassianUserId,
		);
		expect(getLogger().warn).toBeCalledWith(
			deleteWebhookError,
			expect.anything(),
		);
		expect(figmaTeamRepository.delete).toBeCalledWith(figmaTeam.id);
	});
});
