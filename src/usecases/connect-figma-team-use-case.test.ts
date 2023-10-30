import { v4 as uuidv4 } from 'uuid';

import { FigmaTeamAuthStatus } from '../domain/entities';
import {
	generateConnectInstallation,
	generateFigmaTeam,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { ConfigurationStatus, jiraService } from '../infrastructure/jira';
import { figmaTeamRepository } from '../infrastructure/repositories';

import { connectFigmaTeamUseCase } from '.';

describe('connectFigmaTeamUseCase', () => {
	it('should create a webhook and FigmaTeam record', async () => {
		const teamId = uuidv4();
		const teamName = uuidv4();
		const figmaTeam = generateFigmaTeam({ teamId, teamName });
		const atlassianUserId = uuidv4();
		const connectInstallation = generateConnectInstallation();
		const webhookId = uuidv4();

		jest.spyOn(figmaService, 'getTeamName').mockResolvedValue(teamName);
		jest
			.spyOn(figmaService, 'createFileUpdateWebhook')
			.mockResolvedValue({ teamId, webhookId });
		jest
			.spyOn(figmaTeamRepository, 'upsert')
			.mockResolvedValue(generateFigmaTeam({ teamId, teamName }));
		jest
			.spyOn(jiraService, 'setAppConfigurationStatus')
			.mockResolvedValue(undefined);

		const result = await connectFigmaTeamUseCase.execute(
			teamId,
			atlassianUserId,
			connectInstallation,
		);

		expect(result).toStrictEqual({
			teamId: figmaTeam.teamId,
			teamName: figmaTeam.teamName,
			authStatus: figmaTeam.authStatus,
		});
		expect(figmaService.createFileUpdateWebhook).toBeCalledWith(
			teamId,
			expect.anything(),
			{ atlassianUserId, connectInstallationId: connectInstallation.id },
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const generatedPasscode = (
			figmaService.createFileUpdateWebhook as jest.Mock
		).mock.calls[0][1];

		expect(figmaTeamRepository.upsert).toBeCalledWith({
			webhookId,
			webhookPasscode: generatedPasscode,
			teamId,
			teamName,
			figmaAdminAtlassianUserId: atlassianUserId,
			authStatus: FigmaTeamAuthStatus.OK,
			connectInstallationId: connectInstallation.id,
		});
		expect(jiraService.setAppConfigurationStatus).toBeCalledWith(
			ConfigurationStatus.CONFIGURED,
			connectInstallation,
		);
	});

	it('should throw and not create a FigmaTeam record if creating the webhook fails', async () => {
		const error = new Error('create webhook failed');
		jest.spyOn(figmaTeamRepository, 'upsert');
		jest
			.spyOn(figmaService, 'createFileUpdateWebhook')
			.mockRejectedValue(error);

		await expect(
			connectFigmaTeamUseCase.execute(
				uuidv4(),
				uuidv4(),
				generateConnectInstallation(),
			),
		).rejects.toStrictEqual(error);

		expect(figmaTeamRepository.upsert).not.toBeCalled();
	});
});
