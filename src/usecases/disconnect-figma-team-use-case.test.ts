import { v4 as uuidv4 } from 'uuid';

import { disconnectFigmaTeamUseCase } from './disconnect-figma-team-use-case';

import {
	generateConnectInstallation,
	generateFigmaTeam,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

describe('disconnectFigmaTeamUseCase', () => {
	it('should delete the webhook and FigmaTeam', async () => {
		const atlassianUserId = uuidv4();
		const connectInstallation = generateConnectInstallation();
		const figmaTeam = generateFigmaTeam({
			connectInstallationId: connectInstallation.id,
		});
		jest
			.spyOn(figmaTeamRepository, 'getByTeamIdAndConnectInstallationId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest.spyOn(figmaTeamRepository, 'delete').mockResolvedValue(figmaTeam);

		await disconnectFigmaTeamUseCase.execute(
			figmaTeam.teamId,
			atlassianUserId,
			connectInstallation,
		);

		expect(
			figmaTeamRepository.getByTeamIdAndConnectInstallationId,
		).toBeCalledWith(figmaTeam.teamId, figmaTeam.connectInstallationId);
		expect(figmaService.tryDeleteWebhook).toBeCalledWith(figmaTeam.webhookId, {
			connectInstallationId: connectInstallation.id,
			atlassianUserId,
		});
		expect(figmaTeamRepository.delete).toBeCalledWith(figmaTeam.id);
	});
});
