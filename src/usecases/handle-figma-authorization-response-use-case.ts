import { figmaAuthService } from '../infrastructure/figma';
import { connectInstallationRepository } from '../infrastructure/repositories';

export const handleFigmaAuthorizationResponseUseCase = {
	/**
	 * @throw {Error} Unknown error.
	 */
	execute: async (code: string, state: string) => {
		const { atlassianUserId, connectClientKey } =
			figmaAuthService.verifyOAuth2AuthorizationResponseState(state);

		const connectInstallation =
			await connectInstallationRepository.getByClientKey(connectClientKey);

		await figmaAuthService.createCredentials(code, {
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});
	},
};
