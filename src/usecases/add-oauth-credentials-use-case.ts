import { figmaAuthService } from '../infrastructure/figma';

export const addOAuthCredentialsUseCase = {
	execute: async (code: string, atlassianUserId: string) => {
		await figmaAuthService.createCredentials(code, atlassianUserId);
	},
};
