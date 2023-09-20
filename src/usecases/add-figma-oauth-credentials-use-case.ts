import { figmaAuthService } from '../infrastructure/figma';

export const addFigmaOAuthCredentialsUseCase = {
	execute: async (code: string, atlassianUserId: string) => {
		await figmaAuthService.createCredentials(code, atlassianUserId);
	},
};
