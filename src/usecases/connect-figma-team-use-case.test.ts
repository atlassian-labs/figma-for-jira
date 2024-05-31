import { v4 as uuidv4 } from 'uuid';

import { FigmaTeamAuthStatus } from '../domain/entities';
import {
	generateConnectInstallation,
	generateFigmaTeam,
} from '../domain/entities/testing';
import {
	figmaService,
	PaidPlanRequiredFigmaServiceError,
} from '../infrastructure/figma';
import { ConfigurationState, jiraService } from '../infrastructure/jira';
import { figmaTeamRepository } from '../infrastructure/repositories';

import {
	connectFigmaTeamUseCase,
	PaidFigmaPlanRequiredUseCaseResultError,
} from '.';

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
			.spyOn(jiraService, 'setAppConfigurationState')
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
		expect(figmaService.createFileUpdateWebhook).toHaveBeenCalledWith(
			teamId,
			expect.anything(),
			{ atlassianUserId, connectInstallationId: connectInstallation.id },
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const generatedPasscode = (
			figmaService.createFileUpdateWebhook as jest.Mock
		).mock.calls[0][1];

		expect(figmaTeamRepository.upsert).toHaveBeenCalledWith({
			webhookId,
			webhookPasscode: generatedPasscode,
			teamId,
			teamName,
			figmaAdminAtlassianUserId: atlassianUserId,
			authStatus: FigmaTeamAuthStatus.OK,
			connectInstallationId: connectInstallation.id,
		});
		expect(jiraService.setAppConfigurationState).toHaveBeenCalledWith(
			ConfigurationState.CONFIGURED,
			connectInstallation,
		);
	});

	it('should throw `PaidFigmaPlanRequiredUseCaseResultError` if the user is not on paid plan and cannot create webhooks', async () => {
		const teamName = uuidv4();
		jest.spyOn(figmaService, 'getTeamName').mockResolvedValue(teamName);
		jest
			.spyOn(figmaService, 'createFileUpdateWebhook')
			.mockRejectedValue(new PaidPlanRequiredFigmaServiceError());
		jest.spyOn(figmaTeamRepository, 'upsert');

		await expect(
			connectFigmaTeamUseCase.execute(
				uuidv4(),
				uuidv4(),
				generateConnectInstallation(),
			),
		).rejects.toBeInstanceOf(PaidFigmaPlanRequiredUseCaseResultError);

		expect(figmaTeamRepository.upsert).not.toHaveBeenCalled();
	});

	it('should throw and not create a FigmaTeam record if creating the webhook fails', async () => {
		const teamName = uuidv4();
		jest.spyOn(figmaService, 'getTeamName').mockResolvedValue(teamName);
		const error = new Error('create webhook failed');
		jest
			.spyOn(figmaService, 'createFileUpdateWebhook')
			.mockRejectedValue(error);
		jest.spyOn(figmaTeamRepository, 'upsert');

		await expect(
			connectFigmaTeamUseCase.execute(
				uuidv4(),
				uuidv4(),
				generateConnectInstallation(),
			),
		).rejects.toStrictEqual(error);

		expect(figmaTeamRepository.upsert).not.toHaveBeenCalled();
	});
});
