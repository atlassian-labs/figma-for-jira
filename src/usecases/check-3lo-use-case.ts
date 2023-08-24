import { oauthUserCredentialsRepository } from '../infrastructure/repositories';

export const check3loUseCase = {
	execute: async (atlassianUserId: string): Promise<boolean> => {
		const credentials =
			await oauthUserCredentialsRepository.find(atlassianUserId);

		if (!credentials) return false;

		if (credentials.refreshRequired) {
			// TODO: Refresh the token here.
		}

		// TODO: Call Figma API.

		return true;
	},
};
