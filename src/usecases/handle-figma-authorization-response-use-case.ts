import { figmaAuthService } from '../infrastructure/figma';
import { connectInstallationRepository } from '../infrastructure/repositories';

export const handleFigmaAuthorizationResponseUseCase = {
	execute: async (code: string, state: string, nonce: string) => {
		const { atlassianUserId, connectClientKey } =
			figmaAuthService.verifyOAuth2AuthorizationResponseState(state, nonce);

		const connectInstallation =
			await connectInstallationRepository.getByClientKey(connectClientKey);

		await figmaAuthService.createCredentials(code, {
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});
	},
};
