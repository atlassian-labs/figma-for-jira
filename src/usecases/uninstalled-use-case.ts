import { figmaService } from '../infrastructure/figma';
import {
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

export const uninstalledUseCase = {
	execute: async (clientKey: string) => {
		const connectInstallation =
			await connectInstallationRepository.getByClientKey(clientKey);

		const figmaTeams =
			await figmaTeamRepository.findManyByConnectInstallationId(
				connectInstallation.id,
			);

		await Promise.all(
			figmaTeams.map((figmaTeam) =>
				figmaService.deleteWebhook(
					figmaTeam.webhookId,
					figmaTeam.figmaAdminAtlassianUserId,
				),
			),
		);

		await connectInstallationRepository.deleteByClientKey(clientKey);
	},
};
