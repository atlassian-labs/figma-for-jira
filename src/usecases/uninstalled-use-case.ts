import { figmaService } from '../infrastructure/figma';
import {
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

/**
 * @remarks
 * The implementation makes the best effort to remove application data but there is risk of:
 * - Data not being deleted from the database (e.g., in case of a database failure).
 * - Some Figma webhooks not being deleted (e.g., in case of a database or Figma API failure).
 *
 *  Consider making the implementation idempotent and retrying its execution in case of a failure (e.g., using a queue).
 */
export const uninstalledUseCase = {
	execute: async (clientKey: string) => {
		const connectInstallation =
			await connectInstallationRepository.getByClientKey(clientKey);

		const figmaTeams =
			await figmaTeamRepository.findManyByConnectInstallationId(
				connectInstallation.id,
			);

		// The `ConnectInstallation` deletion causes cascading deletion of all the related records.
		// Consider deleting `ConnectInstallation` at the end (after deleting webhooks) if you need to make a use case
		// idempotent and retryable.
		await connectInstallationRepository.deleteByClientKey(clientKey);
		await Promise.allSettled(
			figmaTeams.map((figmaTeam) =>
				figmaService.deleteWebhook(
					figmaTeam.webhookId,
					figmaTeam.figmaAdminAtlassianUserId,
				),
			),
		);
	},
};
