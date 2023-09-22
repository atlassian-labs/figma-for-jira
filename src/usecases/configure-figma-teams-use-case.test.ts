import { v4 as uuidv4 } from 'uuid';

import { type FigmaTeam, FigmaTeamAuthStatus } from '../domain/entities';
import { generateConnectInstallation } from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

import { configureFigmaTeamUseCase } from '.';

describe('configureFigmaTeamUseCase', () => {
	it('should create a webhook and FigmaTeam record', async () => {
		const teamId = uuidv4();
		const atlassianUserId = uuidv4();
		const connectInstallation = generateConnectInstallation();
		const webhookId = uuidv4();

		jest
			.spyOn(figmaService, 'createFileUpdateWebhook')
			.mockResolvedValue({ teamId, webhookId });
		jest
			.spyOn(figmaTeamRepository, 'upsert')
			.mockResolvedValue({} as FigmaTeam);

		await configureFigmaTeamUseCase.execute(
			teamId,
			atlassianUserId,
			connectInstallation,
		);

		expect(figmaService.createFileUpdateWebhook).toBeCalledWith(
			teamId,
			atlassianUserId,
			connectInstallation.sharedSecret,
		);
		expect(figmaTeamRepository.upsert).toBeCalledWith({
			webhookId,
			teamId,
			teamName: 'TODO',
			figmaAdminAtlassianUserId: atlassianUserId,
			authStatus: FigmaTeamAuthStatus.OK,
			connectInstallationId: connectInstallation.id,
		});
	});

	it('should throw if creating the webhook fails', async () => {
		const error = new Error('create webhook failed');
		jest
			.spyOn(figmaService, 'createFileUpdateWebhook')
			.mockRejectedValue(error);

		await expect(
			configureFigmaTeamUseCase.execute(
				uuidv4(),
				uuidv4(),
				generateConnectInstallation(),
			),
		).rejects.toStrictEqual(error);
	});

	it('should throw if creating the FigmaTeam record fails', async () => {
		const error = new Error('create FigmaTeam failed');
		jest
			.spyOn(figmaService, 'createFileUpdateWebhook')
			.mockResolvedValue(
				{} as ReturnType<typeof figmaService.createFileUpdateWebhook>,
			);
		jest.spyOn(figmaTeamRepository, 'upsert').mockRejectedValue(error);

		await expect(
			configureFigmaTeamUseCase.execute(
				uuidv4(),
				uuidv4(),
				generateConnectInstallation(),
			),
		).rejects.toStrictEqual(error);
	});
});
